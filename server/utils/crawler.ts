import {
	pipeline
} from 'stream';
import rp from 'request-promise-native';
import contentDisposition from 'content-disposition';
const {
	http,
	https
} = require('follow-redirects');
const url = require('url');

import db from '../common/database';
import {
	IDataset
} from '../apps/api/models/dataset';
import config from '../config';
import FileTypeDetector from './fileTypeDetector';
import hostsHandler from './hostsHandler';
import l from '../common/logger';


class DatasetError extends Error {
	message: string;
	statusCode: number;
	constructor(message: string, statusCode: number) {
		super()
		this.message = message
		this.statusCode = statusCode
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

			//agent initialisation
			switch (this.dataset.url.protocol) {
				case 'https:':
					this.agent = https
					break;
				case 'http:':
					this.agent = http
					break;
				default:
					throw new Error(`Neither http nor https: ${this.agent}`)
			}


			let fileChanged: boolean = false;

			if (this.dataset.crawl_info.firstCrawl == true) {

				fileChanged = await this.metaInit()

			} else {

				let downloaded = await this.download()
				if (downloaded == true) fileChanged = await this.checkHash()

			}

			if (fileChanged) {
				this.calcNextCrawl(true);
			} else {
				this.calcNextCrawl(false)
			}

			this.dataset.crawl_info.firstCrawl = false
			await this.dataset.save()
			await hostsHandler.releaseHost(this.dataset.url.hostname)
			return fileChanged

		} catch (error) {
			this.addError(error);
			this.calcNextCrawl(false)
			this.dataset.crawl_info.firstCrawl = false
			await this.dataset.save()
			await hostsHandler.releaseHost(this.dataset.url.hostname)
			return false
		}


	}
	/** TODO
	 * - follow redirects
	 * - save redirect status
	 * - fileHandler?
	 */
	async download(): Promise < boolean > {

		return new Promise < boolean > ((resolve, reject) => {

			const options = url.parse(this.dataset.url.href);
			options.trackRedirects = true;
			options.maxRedirects = 10;

			this.agent.get(this.dataset.url.href, (res) => {

				pipeline(
					res,
					db.bucket.openUploadStream(this.dataset.meta.filename, {
						metadata: {
							dataset_ref_id: this.dataset._id,
							version: this.dataset.meta.versionCount
						}
					}), (error) => {
						if (!error) resolve(true)
						else reject(error)
					}
				);

			}).on('error', (error) => {
				reject(error)
			})

		})

	}

	async checkHash(): Promise < boolean > {

		if (this.dataset.meta.versionCount > 0) {
			let files = await db.file.find().getFilesByNameAndVersions(this.dataset._id, this.dataset.meta.versionCount - 1, this.dataset.meta.versionCount)
			let oldFile = files[files.length - 2]
			let newFile = files[files.length - 1]

			if (newFile.length < config.MaxFileSizeInBytes) {

				if (oldFile.md5 != newFile.md5) {
					//new file saved
					this.dataset.versions.push(newFile._id);
					this.dataset.meta.versionCount++;
					this.dataset.crawl_info.stopped = false;
					return true
				} else {
					//not new file deleted
					await db.bucket.delete(newFile._id)
					return false
				}
			} else {
				await db.bucket.delete(newFile._id)
				this.dataset.crawl_info.stopped = true;

				throw new DatasetError('max file size exceeded', 194)
			}

		} else {
			//in case there is no existing file
			let file = await db.file.findOne().getFileByVersion(this.dataset._id, this.dataset.meta.versionCount);
			if (file.length > config.MaxFileSizeInBytes) {
				await db.bucket.delete(file._id)
				this.dataset.crawl_info.stopped = true;
				throw new DatasetError('max file size exceeded', 194)
			}
			this.dataset.versions.push(file._id);
			this.dataset.meta.versionCount++;
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
	async metaInit(): Promise < boolean > {

		let head;

		try {
			head = await rp.head(this.dataset.url.href, {
				followAllRedirects: true,
				maxRedirects: 10,
				rejectUnauthorized: false
			});
			if (parseInt(head['content-length']) > config.MaxFileSizeInBytes) {
				this.dataset.crawl_info.stopped = true;
				throw new DatasetError('max file size exceeded', 194)
			}
		} catch (error) {
			throw error;
		}

		if (!this.dataset.meta.filename) {
			try {
				this.dataset.meta.filename = contentDisposition.parse(head['content-disposition']).parameters.filename
			} catch (error) {
				this.dataset.meta.filename = this.dataset.url.pathname.split('/')[this.dataset.url.pathname.split('/').length - 1]
			}
		}


		let detector = new FileTypeDetector();

		try {
			detector.setMimeType(head['content-type'].split(';')[0])
		} catch (error) {
			let fileSplit = this.dataset.meta.filename.split('.')
			detector.setExtension((fileSplit.length > 1) ? fileSplit[fileSplit.length - 1] : 'unknown')
		}

		this.dataset.meta.filetype = detector.mimeType
		this.dataset.meta.extension = detector.extension

		return true

	}

	/** TODO
	 * - get specific errors
	 * - error codes
	 * - look in request object
	 */
	addError(error) {

		let code:number;

		if (error.error) {
			l.error('unhandled RP Error', error, this.dataset.url.href);
			error = error.error
		}

		if (error.statusCode) {
			code = error.statusCode
		} else if (error.code == 'ENOTFOUND'){
			code = 404
		} else if (error.code = 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
			code = 112;
		} else {
			code = 111;
			l.error('unhandled', error, this.dataset.url.href);
		}


		let err = new DatasetError(error.message, code)
		this.dataset.crawl_info.errorStore.push(err);
		this.dataset.crawl_info.errorCount++;
		if (this.dataset.crawl_info.errorCount >= config.ErrorCountTreshold) {
			this.dataset.crawl_info.stopped = true;
		}
	}

}