const {
	pipeline
} = require('stream');
const http = require('http');
const https = require('https');
const db = require('../database').getInstance();
const {
	CRAWL_HostInterval,
	CRAWL_minRange,
	CRAWL_maxRange,
	ErrorCountTreshold,
	MaxFileSizeInBytes
} = require('../config');

const rp = require('request-promise-native');
var contentDisposition = require('content-disposition')
const mime = require('mime');


/** TODO
 * - is dataset compressed?
 * - filetype detection
 * - metadata generation
 */
class Crawler {
	constructor(url) {
		this.url = url;
		this.agent;
	}

	async crawl() {

		try {

			this.dataset = await db.dataset.find().getDatasetToCrawl(this.url)
			if (!this.dataset) {
				return false
			}

			//agent initialisation
			switch (this.dataset.url.protocol) {
				case 'https:':
					this.agent = https
					break;
				case 'http:':
					this.agent = http
					break;
				default:
					this.agent = http
					console.error(new Error(`Neither http nor https: ${this.dataset.url.href}`))
					break;
			}

			await this.lockHost()

			if (this.dataset.crawl_info.firstCrawl == true) {

				this.dataset.crawl_info.firstCrawl = false
				await this.metaInit()

			} else {
				await this.download();
			}

			await this.releaseHost();
			return true

		} catch (error) {
			this.addError(error.message, true);
			console.error(error.message);
			return false
		}

	}

	async download() {

		try {

			console.log(new Date(), "crawling:", this.dataset.url.href);
			this.agent.get(this.dataset.url.href, (resp) => {

				pipeline(
					resp,
					db.bucket.openUploadStream(this.dataset.meta.filename, {
						metadata: {
							dataset_ref_id: this.dataset._id,
							version: this.dataset.meta.versionCount
						}
					}), (error) => {
						if (!error) {

							//compare old and new file
							this.checkHash()

						} else {
							this.addError(error.message, true);
						}
					}
				);
			}).on('error', (error) => {
				this.addError(error.message, true);
			});

		} catch (error) {
			this.addError(error);
			console.error(error.message);
		}
	}

	async checkHash() {

		try {
			if (this.dataset.meta.versionCount > 0) {
				let files = await db.file.find().getFilesByNameAndVersions(this.dataset._id, this.dataset.meta.versionCount - 1, this.dataset.meta.versionCount)
				let oldFile = files[files.length - 2]
				let newFile = files[files.length - 1]

				if (parseInt(newFile.length) < parseInt(MaxFileSizeInBytes)) {

					if (oldFile.md5 != newFile.md5) {
						//new file saved
						this.dataset.versions.push(newFile._id);
						this.dataset.meta.versionCount++;
						this.dataset.crawl_info.stopped = false;
						this.calcNextCrawl(true);
					} else {
						db.bucket.delete(newFile._id).then(async () => {
							//file deleted because of duplicate
							this.calcNextCrawl(false);
						})
					}
				} else {
					db.bucket.delete(newFile._id).then(async () => {
						this.dataset.crawl_info.stopped = true;
						this.addError('max file size exceeded', true);
					})
				}

			} else {
				//in case there is no existing file
				let file = await db.file.findOne().getFileByVersion(this.dataset._id, this.dataset.meta.versionCount);
				this.dataset.versions.push(file._id);
				this.dataset.meta.versionCount++;
				this.calcNextCrawl(true);
			}

		} catch (error) {
			this.addError(error.message, true);
			console.error(error.message);
		}
	}

	async calcNextCrawl(hasChanged = false) {

		let now = new Date()
		let interval = (now - this.dataset.crawl_info.lastCrawlAttempt) / 1000; //to get seconds
		if (interval > CRAWL_maxRange) {
			interval = parseInt(CRAWL_maxRange)
		}
		this.dataset.crawl_info.lastCrawlAttempt = now;

		this.dataset.crawl_info.changeDistribution.push({
			newFile: hasChanged,
			interval: interval
		})

		if (this.dataset.crawl_info.changeDistribution.length > 2 && !(this.dataset.crawl_info.crawlInterval < CRAWL_minRange)) {

			//prevent infinite array
			if (this.dataset.crawl_info.changeDistribution.length > 50) {
				this.dataset.crawl_info.changeDistribution.shift()
			}


			let intervalBetweenNewFiles = this.dataset.crawl_info.changeDistribution.reduce((acc, curr) => {
				if (curr.newFile == true) {
					acc.push(curr.interval)
				} else {
					acc[acc.length - 1] += curr.interval
				}
				return acc;
			}, []);

			let sum = intervalBetweenNewFiles.reduce(function (a, b) {
				return a + b;
			});

			//TODO make it better than average haha
			this.dataset.crawl_info.crawlInterval = sum / intervalBetweenNewFiles.length;

			if (hasChanged) {
				this.dataset.crawl_info.crawlInterval = this.dataset.crawl_info.crawlInterval / 2
			}
			this.dataset.crawl_info.nextCrawl = new Date(now.getTime() + this.dataset.crawl_info.crawlInterval * 1000);
		} else {
			this.dataset.crawl_info.nextCrawl = new Date(now.getTime() + this.dataset.crawl_info.crawlInterval * 1000);
		}

		await this.dataset.save();
	}

	async metaInit() {

		let head;

		try {
			head = await rp.head(this.dataset.url.href);
		} catch (error) {
			this.addError(error.message, false)
			console.error(error.message);
		}

		if (!(this.dataset.meta.filename.length > 0)) {

			try {
				this.dataset.meta.filename = contentDisposition.parse(head['content-disposition']).parameters.filename
			} catch (error) {
				this.dataset.meta.filename = this.dataset.url.pathname.split('/')[this.dataset.url.pathname.split('/').length - 1]
			}

		}

		try {
			this.dataset.meta.filetype = mime.getExtension(head['content-type'].split(';')[0])
		} catch (error) {
			let fileSplit = this.dataset.meta.filename.split('.')
			this.dataset.meta.filetype = (fileSplit.length > 1) ? fileSplit[fileSplit.length - 1] : 'unknown'
		}

		try {
			if (parseInt(head['content-length']) > parseInt(MaxFileSizeInBytes)) {
				this.dataset.crawl_info.stopped = true;
				this.addError('max file size exceeded', true);
			} else {
				this.calcNextCrawl(true);
			}
		} catch (error) {
			this.addError(error.message, true);
			console.error(error.message);
		}
	}

	async lockHost() {

		await db.dataset.updateMany({
			'crawl_info.host.name': this.dataset.crawl_info.host.name
		}, {
			$set: {
				'crawl_info.host.nextCrawl': new Date(new Date().getTime() + CRAWL_HostInterval * 1000),
				'crawl_info.host.currentlyCrawled': true
			}
		}).exec();

	}

	async releaseHost() {

		await db.dataset.updateMany({
			'crawl_info.host.name': this.dataset.crawl_info.host.name
		}, {
			$set: {
				'crawl_info.host.nextCrawl': new Date(new Date().getTime() + CRAWL_HostInterval * 1000),
				'crawl_info.host.currentlyCrawled': false
			}
		}).exec();

	}

	async addError(error, calcNextCrawl) {
		this.dataset.crawl_info.errorStore.push(error);
		this.dataset.crawl_info.errorCount++;
		if (this.dataset.crawl_info.errorCount >= ErrorCountTreshold) {
			this.dataset.crawl_info.stopped = true;
		}
		if (calcNextCrawl == true) this.calcNextCrawl(false);
	}

}

module.exports = Crawler;