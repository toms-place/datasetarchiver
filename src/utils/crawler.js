//From which number of errors should the crawling be stopped
const errorCountTreshold = 3;

const {
	pipeline
} = require('stream');
const http = require('http');
const https = require('https');
const db = require('../database');
const {
	CRAWL_HostInterval
} = require('../config');
import {PythonShell} from 'python-shell';
const path = require('path');
const fs = require('fs');




/** TODO
 * - is dataset compressed?
 * - filetype detection
 * - metadata generation
 */
class Crawler {
	constructor(dataset) {
		this.dataset = dataset;
		this.socket;
		this.host;
		this.init();
	}

	async init() {

		try {

			//socket initialisation
			switch (this.dataset.url.protocol) {
				case 'https:':
					this.socket = https
					break;
				case 'http:':
					this.socket = http
					break;
				default:
					throw new Error('Neither http nor https...')
			}

			//host initialisation
			this.host = await db.host.getHostByName(this.dataset.url.hostname);
			if (this.host == null) this.host = await new db.host({
				hostname: this.dataset.url.hostname
			})

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
				this.socket.get(this.dataset.url.href, (resp) => {

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
					console.log("Error: " + error.message);
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
			console.log('not crawling now, host busy')
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

		let interval;
		if (this.dataset.changeDistribution.length == 0) {
			interval = this.dataset.crawlInterval
		} else {
			let referenceDate = this.dataset.changeDistribution[this.dataset.changeDistribution.length - 1].date
			interval = (this.dataset.nextCrawl - referenceDate) / 1000; //to get seconds
		}

		this.dataset.changeDistribution.push({
			newFile: hasChanged,
			interval: interval,
			date: new Date()
		})

		if (this.dataset.changeDistribution.length < 2) {

			switch (hasChanged) {
				case true:
					this.dataset.crawlInterval = this.dataset.crawlInterval / 2;
					break;
				case false:
					this.dataset.crawlInterval = this.dataset.crawlInterval * 2;
					break;
				default:
					this.dataset.crawlInterval = this.dataset.crawlInterval * 2;
					break;
			}

			this.dataset.nextCrawl = new Date(new Date().getTime() + this.dataset.crawlInterval * 1000);

		} else {
			//TODO calc next crawl
			//console.log(this.dataset.changeDistribution)var PythonShell = require('python-shell');

			this.dataset.nextCrawl = new Date(new Date().getTime() + this.dataset.crawlInterval * 1000);
		}
		this.dataset.stopped = false;
		await this.dataset.save();
	}
}

module.exports = Crawler;



/* RUN PYTHON

			var options = {
				scriptPath: path.dirname(fs.realpathSync(__filename)),
				args: [this.dataset.changeDistribution]
			};

			PythonShell.run('calcNextCrawl.py', options, function (err, results) {
				if (err)
					throw err;
				// Results is an array consisting of messages collected during execution
				console.log('results: %j', results);
			});
 */