//From which number of errors should the crawling be stopped
const errorCountTreshold = 3;

const {
	pipeline
} = require('stream');
const http = require('http');
const https = require('https');
const db = require('../database');
const {
	CRAWL_HostInterval,
	CRAWL_InitRange
} = require('../config');




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

			//host initialisation
			this.host = await db.host.getHostByName(this.dataset.url.hostname);

			this.crawl();

		} catch (error) {
			console.error(error)
		}

	}

	async crawl() {

		//check if crawl is permitted
		if (this.dataset.stopped != true && this.host.currentlyCrawled == false && this.host.nextCrawl < new Date()) {

			try {
				this.host.currentlyCrawled = true
				this.host.nextCrawl = new Date(new Date().getTime() + CRAWL_HostInterval * 60000);
				await this.host.save()

				console.log("now crawling:", this.dataset.url.href, new Date());
				this.protocol.get(this.dataset.url.href, (resp) => {

					pipeline(
						resp,
						db.bucket.openUploadStream(this.dataset.filename, {
							metadata: {
								version: this.dataset.nextVersionCount
							}
						}), async (error) => {
							if (!error) {

								//compare old an new file
								await this.checkHash()

							} else {
								console.error(error)
								this.dataset.errorCount++;
								if (this.dataset.errorCount >= errorCountTreshold) {
									this.dataset.stopped = true;
								} else {
									this.dataset.stopped = false;
								}
								this.calcNextCrawl(false);
							}
						}
					);
				}).on('error', (error) => {
					console.error("Error: " + error.message);
				});

				this.host.currentlyCrawled = false
				await this.host.save()

			} catch (error) {
				console.error(error)
				this.dataset.errorCount++;
				if (this.dataset.errorCount >= errorCountTreshold) {
					this.dataset.stopped = true;
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
			if (this.dataset.nextVersionCount > 0) {
				let files = await db.file.find().getFilesByNameAndVersions(this.dataset.filename, this.dataset.nextVersionCount - 1, this.dataset.nextVersionCount)

				let oldFile = files[files.length - 2]
				let newFile = files[files.length - 1]

				if (oldFile.md5 != newFile.md5) {
					//new file saved
					this.dataset.versions.push(newFile._id);
					this.dataset.nextVersionCount++;
					this.dataset.stopped = false;
					this.calcNextCrawl(true)
				} else {
					await db.bucket.delete(newFile._id).then(async () => {
						//file deleted because of duplicate
						this.calcNextCrawl(false)
					})
				}

			} else {
				//in case there is no existing file
				let file = await db.file.findOne().getFileByVersion(this.dataset.filename, this.dataset.nextVersionCount);
				this.dataset.versions.push(file._id);
				this.dataset.nextVersionCount++;
				this.dataset.stopped = false;
				this.calcNextCrawl(true);
			}

		} catch (error) {
			console.error(error)
		}
	}
	async calcNextCrawl(hasChanged = false) {

		let interval = (this.dataset.nextCrawl - this.dataset.lastCrawlAttempt) / 1000; //to get seconds
		this.dataset.lastCrawlAttempt = new Date();

		this.dataset.changeDistribution.push({
			newFile: hasChanged,
			interval: interval
		})

		if (this.dataset.changeDistribution.length > 2 && !(this.dataset.crawlInterval < CRAWL_InitRange / 4)) {

			//prevent infinite array
			if (this.dataset.changeDistribution.length > 50) {
				this.dataset.changeDistribution.shift()
			}

			let intervalBetweenNewFiles = this.dataset.changeDistribution.reduce((acc, curr) => {
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
			this.dataset.crawlInterval = sum / intervalBetweenNewFiles.length;

			if (hasChanged) {
				this.dataset.crawlInterval = this.dataset.crawlInterval / 2
			}
			this.dataset.nextCrawl = new Date(new Date().getTime() + this.dataset.crawlInterval * 1000);
		} else {
			this.dataset.nextCrawl = new Date(new Date().getTime() + this.dataset.crawlInterval * 1000);
		}

		this.dataset.stopped = false;
		await this.dataset.save();
	}
}

module.exports = Crawler;