import request from 'request';

import contentDisposition from 'content-disposition';

import db from '../common/database';
import {
	IDataset
} from '../apps/api/models/dataset';
import config from '../config';
import fileTypeDetector from './fileTypeDetector';
import l from '../common/logger';


class DatasetError extends Error {
	message: string;
	code: number;
	constructor(message: string, code: number) {
		super()
		this.message = message
		this.code = code
	}
}

/** TODO
 * - is dataset compressed?
 * - filetype detection
 * - metadata generation
 */
export default class Crawler {
	url: URL;
	agent: any
	dataset: IDataset;

	constructor(dataset: IDataset) {
		this.dataset = dataset;
	}

	async crawl(): Promise < boolean > {

		try {

			await this.download()
			let hasChanged = await this.checkHash()
			this.calcNextCrawl(hasChanged);

			this.dataset.crawl_info.firstCrawl = false
			this.dataset.crawl_info.currentlyCrawled = false
			await this.dataset.save()
			await db.host.releaseHost(this.dataset.url.hostname)
			return true

		} catch (error) {
			try {
				this.dataset.crawl_info.firstCrawl = false
				this.dataset.crawl_info.currentlyCrawled = false
				this.addError(error);
				this.calcNextCrawl(false)
				await this.dataset.save()
				await db.host.releaseHost(this.dataset.url.hostname)
				return false
			} catch (error) {
				l.error('DB saving Error:', error)
				return false
			}
		}


	}
	/** TODO
	 * - follow redirects
	 * - save redirect status
	 * - fileHandler?
	 */
	async download(): Promise < boolean > {

		let detector = new fileTypeDetector()

		detector.on('file-type', (filetype) => {
			if (filetype === null) {} else {
				this.dataset.meta.filetype = filetype.mime
				this.dataset.meta.extension = filetype.ext
			}
		})

		let uploadStream = db.bucket.openUploadStream(this.dataset._id, {
			metadata: {
				dataset_ref_id: this.dataset._id,
				version: this.dataset.meta.versionCount
			}
		})

		return new Promise((resolve, reject) => {

			let downloadStart = new Date()

			//request.debug = true
			request(this.dataset.url.href, {
					followAllRedirects: true,
					maxRedirects: 5,
					rejectUnauthorized: false,
					headers: {
						'User-Agent': 'request'
					},
					timeout: config.CRAWL_timeout,
					gzip: true,
					jar: true
				})
				.on('error', (error) => {
					reject(error)
				})
				.on('response', (response) => {

					try {
						this.checkHeaders(response.headers)
					} catch (error) {
						reject(error)
					}

					let downloadTime = new Date().getTime() - downloadStart.getTime()
					if (this.dataset.meta.meanDownloadTime != 0) {
						this.dataset.meta.meanDownloadTime = (this.dataset.meta.meanDownloadTime + downloadTime) / 2
					} else {
						this.dataset.meta.meanDownloadTime = downloadTime
					}

				})
				.pipe(detector)
				.on('error', (error) => {
					reject(error)
				})
				.pipe(uploadStream)
				.on('error', (error) => {
					reject(error)
				})
				.on('finish', () => {

					let downloadTime = new Date().getTime() - downloadStart.getTime()
					if (this.dataset.meta.meanSavingTime != 0) {
						this.dataset.meta.meanSavingTime = (this.dataset.meta.meanSavingTime + downloadTime) / 2
					} else {
						this.dataset.meta.meanSavingTime = downloadTime
					}

					resolve(true)
				});

		})

	}

	async checkHash(): Promise < boolean > {

		if (this.dataset.meta.versionCount > 0) {
			//let files = await db.file.find().getLastTwoFileVersionsBy_dataset_ref_id(this.dataset._id, this.dataset.meta.versionCount - 1, this.dataset.meta.versionCount)

			let oldFile = await db.file.find().getFileByVersion(this.dataset._id, this.dataset.meta.versionCount - 1)
			let newFile = await db.file.find().getFileByVersion(this.dataset._id, this.dataset.meta.versionCount)
			//let oldFile = files[files.length - 2]
			//let newFile = files[files.length - 1]

			if (newFile.length <= config.MaxFileSizeInBytes) {

				if (oldFile.md5 != newFile.md5) {
					//new file saved
					this.dataset.versions.push(newFile._id);
					this.dataset.meta.versionCount++;
					this.dataset.crawl_info.stopped = false;
					return true
				} else {
					//delete not new file

					await new Promise((resolve, reject) => {
						db.bucket.delete(newFile._id, (error) => {
							if (!error) resolve()
							else reject(error)
						})
					});

					return false
				}
			} else {

				await new Promise((resolve, reject) => {
					db.bucket.delete(newFile._id, (error) => {
						if (!error) resolve()
						else reject(error)
					})
				});
				this.dataset.crawl_info.stopped = true;
				throw new DatasetError('max file size exceeded', 194)

			}

		} else {
			//in case there is no existing file
			let file = await db.file.findOne().getFileByVersion(this.dataset._id, this.dataset.meta.versionCount);
			if (file.length > config.MaxFileSizeInBytes) {
				await new Promise((resolve, reject) => {
					db.bucket.delete(file._id, (error) => {
						if (!error) resolve()
						else reject(error)
					})
				});
				this.dataset.versions = [];
				this.dataset.crawl_info.stopped = true;
				throw new DatasetError('max file size exceeded', 194)
			} else {
				this.dataset.versions.push(file._id);
				this.dataset.meta.versionCount++;
			}
			return true
		}

	}

	calcNextCrawl(hasChanged = false): void {

		//get time since last crawl
		let now = new Date().getTime()
		let interval = (now - this.dataset.crawl_info.lastCrawlAttempt) / 1000; //to get seconds

		//only add changeDistripution if file is downloaded
		if (!this.dataset.crawl_info.firstCrawl) {
			this.dataset.crawl_info.changeDistribution.push({
				newFile: hasChanged,
				interval: interval
			})
		}

		//make calculation only after second download
		if (this.dataset.crawl_info.changeDistribution.length > 1) {

			//prevent infinite array
			if (this.dataset.crawl_info.changeDistribution.length > config.CRAWL_DistributionArrayMax) {
				this.dataset.crawl_info.changeDistribution.shift()
			}

			//reduce to changes between files [ 1000100100101000 --> 43324 (1 change; 0 nochange; output = time between) ]
			let intervalBetweenNewFiles = this.dataset.crawl_info.changeDistribution.reduce((acc, curr) => {
				if (curr.newFile == true || acc.length == 0) {
					acc.push(curr.interval)
				} else {
					acc[acc.length - 1] += curr.interval
				}
				return acc;
			}, []);

			//sum up change time
			let sum = intervalBetweenNewFiles.reduce(function (a, b) {
				return a + b;
			});

			//TODO make it better than average haha
			interval = sum / intervalBetweenNewFiles.length;

		}

		//reduce crawl time by 2 times if it has changed
		if (hasChanged) interval /= 2

		//check if intervall is in defined range
		if (interval > config.CRAWL_maxRange) {
			interval = config.CRAWL_maxRange
		} else if (interval < config.CRAWL_minRange) {
			interval = config.CRAWL_minRange
		}

		//set new crawl time
		this.dataset.crawl_info.crawlInterval = interval
		this.dataset.crawl_info.nextCrawl = new Date(now + interval * 1000);
		//set this time as last crawl time
		this.dataset.crawl_info.lastCrawlAttempt = now;
		return

	}

	/** TODO
	 * - metadata generation
	 */
	checkHeaders(headers): void {

		//save redirects

		let detector = new fileTypeDetector();

		if (parseInt(headers['content-length']) > config.MaxFileSizeInBytes) {
			this.dataset.crawl_info.stopped = true;
			throw new DatasetError('max file size exceeded', 194)
		}

		if (!this.dataset.meta.filename) {
			try {
				this.dataset.meta.filename = contentDisposition.parse(headers['content-disposition']).parameters.filename
			} catch (error) {
				this.dataset.meta.filename = this.dataset.url.pathname.split('/')[this.dataset.url.pathname.split('/').length - 1]
			}
		}

		try {
			detector.setMimeType(headers['content-type'].split(';')[0])
		} catch (error) {
			let fileSplit = this.dataset.meta.filename.split('.')
			detector.setExtension((fileSplit.length > 1) ? fileSplit[fileSplit.length - 1] : 'unknown')
		}

		this.dataset.meta.filetype = detector.mimeType
		this.dataset.meta.extension = detector.extension

		return

	}

	/** TODO
	 * - get specific errors
	 * - error codes
	 * - look in request object
	 */
	addError(error) {

		try {

			let statusCode: number;

			switch (error.code) {
				case 'ETIMEDOUT':
					statusCode = 114
					break;
				case 'ESOCKETTIMEDOUT':
					statusCode = 114
					break;
				case 'ENOTFOUND':
					statusCode = 404
					break;
				case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
					l.info('UNABLE_TO_VERIFY_LEAF_SIGNATURE', error, this.dataset.id);
					statusCode = 112
					break;
				case 194:
					statusCode = 194
					break;
				default:
					statusCode = 111;
					l.error('unhandled', error, this.dataset.id);
					break;
			}

			let err = new DatasetError(error.message, statusCode)
			this.dataset.crawl_info.errorStore.push(err);
			this.dataset.crawl_info.errorCount++;
			if (this.dataset.crawl_info.errorCount >= config.ErrorCountTreshold) {
				this.dataset.crawl_info.stopped = true;
			}

		} catch (error) {
			l.error('addError', error, this.dataset.id)
		}

	}

}