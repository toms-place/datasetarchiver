//From which number of errors should the crawling be stopped
const errorCountTreshold = 3;

const {
	pipeline
} = require('stream');
const http = require('http');
const https = require('https');
const db = require('../database').getInstance();
const {
	CRAWL_HostInterval,
	CRAWL_InitRange
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
	constructor(dataset) {
		this.dataset = dataset;
		this.protocol;
		this.host;
		this.init();
	}

	async init() {

		try {

			//protocol initialisation
			switch (this.dataset.url.protocol) {
				case 'https:':
					this.protocol = https
					break;
				case 'http:':
					this.protocol = http
					break;
				default:
					throw new Error('Neither http nor https...')
			}

			//meta init
			if (this.dataset.crawlingInfo.firstCrawl == true) {

				let head = await rp.head(this.dataset.url.href)
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

				this.dataset.crawlingInfo.firstCrawl = false
				this.dataset.save()

			} else {
				this.crawl();
			}

		} catch (error) {
			console.error(error)
		}

	}

	async crawl() {

		//check if crawl is permitted
		if (this.dataset.stopped != true && this.dataset.crawlingInfo.host.currentlyCrawled == false && this.dataset.crawlingInfo.host.nextCrawl < new Date()) {

			try {

				await db.dataset.updateMany({
						'crawlingInfo.host.name': this.dataset.crawlingInfo.host.name
					},
					[{
						'crawlingInfo.host.currentlyCrawled': true
					}, {
						'crawlingInfo.host.nextCrawl': new Date(new Date().getTime() + CRAWL_HostInterval * 60000)
					}]
				).exec();

				console.log("now crawling:", this.dataset.url.href, new Date());
				this.protocol.get(this.dataset.url.href, (resp) => {

					pipeline(
						resp,
						db.bucket.openUploadStream(this.dataset.meta.filename, {
							metadata: {
								dataset_ref_id: this.dataset._id,
								version: this.dataset.meta.versionCount
							}
						}), async (error) => {
							if (!error) {

								//compare old an new file
								await this.checkHash()

							} else {
								console.error(error)
								this.dataset.crawlingInfo.errorCount++;
								if (this.dataset.crawlingInfo.errorCount >= errorCountTreshold) {
									this.dataset.crawlingInfo.stopped = true;
								} else {
									this.dataset.crawlingInfo.stopped = false;
								}
								this.calcNextCrawl(false);
							}
						}
					);
				}).on('error', (error) => {
					console.error("Error: " + error.message);
				});

				await db.dataset.updateMany({
					'crawlingInfo.host.name': this.dataset.crawlingInfo.host.name
				}, {
					'crawlingInfo.host.currentlyCrawled': false
				}).exec();

			} catch (error) {
				console.error(error)
				this.dataset.crawlingInfo.errorCount++;
				if (this.dataset.crawlingInfo.errorCount >= errorCountTreshold) {
					this.dataset.crawlingInfo.stopped = true;
					await this.dataset.save()
					throw new Error('Stopping: ' + this.dataset.url.href);
				};
				this.calcNextCrawl(false);
			}
		} else {
			console.log('not crawling now, host busy');
		}
	}

	async checkHash() {

		try {
			if (this.dataset.meta.versionCount > 0) {
				let files = await db.file.find().getFilesByNameAndVersions(this.dataset._id, this.dataset.meta.versionCount - 1, this.dataset.meta.versionCount)
				let oldFile = files[files.length - 2]
				let newFile = files[files.length - 1]

				if (oldFile.md5 != newFile.md5) {
					//new file saved
					this.dataset.versions.push(newFile._id);
					this.dataset.meta.versionCount++;
					this.dataset.crawlingInfo.stopped = false;
					this.calcNextCrawl(true)
				} else {
					db.bucket.delete(newFile._id).then(async () => {
						//file deleted because of duplicate
						this.calcNextCrawl(false)
					})
				}

			} else {
				//in case there is no existing file
				let file = await db.file.findOne().getFileByVersion(this.dataset._id, this.dataset.meta.versionCount);
				this.dataset.versions.push(file._id);
				this.dataset.meta.versionCount++;
				this.dataset.crawlingInfo.stopped = false;
				this.calcNextCrawl(true);
			}

		} catch (error) {
			console.error(error)
		}
	}
	async calcNextCrawl(hasChanged = false) {

		let now = new Date()
		let interval = (now - this.dataset.crawlingInfo.lastCrawlAttempt) / 1000; //to get seconds
		this.dataset.crawlingInfo.lastCrawlAttempt = now;

		this.dataset.crawlingInfo.changeDistribution.push({
			newFile: hasChanged,
			interval: interval
		})

		if (this.dataset.crawlingInfo.changeDistribution.length > 2 && !(this.dataset.crawlingInfo.crawlInterval < CRAWL_InitRange / 4)) {

			//prevent infinite array
			if (this.dataset.crawlingInfo.changeDistribution.length > 50) {
				this.dataset.crawlingInfo.changeDistribution.shift()
			}

			let intervalBetweenNewFiles = this.dataset.crawlingInfo.changeDistribution.reduce((acc, curr) => {
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
			this.dataset.crawlingInfo.crawlInterval = sum / intervalBetweenNewFiles.length;

			if (hasChanged) {
				this.dataset.crawlingInfo.crawlInterval = this.dataset.crawlingInfo.crawlInterval / 2
			}
			this.dataset.crawlingInfo.nextCrawl = new Date(now.getTime() + this.dataset.crawlingInfo.crawlInterval * 1000);
		} else {
			this.dataset.crawlingInfo.nextCrawl = new Date(now.getTime() + this.dataset.crawlingInfo.crawlInterval * 1000);
		}

		this.dataset.crawlingInfo.stopped = false;
		await this.dataset.save();
	}
}

module.exports = Crawler;