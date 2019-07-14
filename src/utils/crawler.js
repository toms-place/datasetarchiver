//From which number of errors should the crawling be stopped
const errorCountTreshold = 3;

const {
	pipeline
} = require('stream');
const rp = require('request-promise-native');
const http = require('http');
const https = require('https');
import db from '../database';


/** TODO
 * - is dataset compressed?
 * - filetype detection
 * - metadata generation
 */
class Crawler {
	constructor(dataset) {
		this.dataset = dataset;
		this.crawl();
	}

	async crawl() {

		if (this.dataset.stopped != true) {
			try {

				switch (this.dataset.url.protocol) {
					case 'https:':
						this.connector = https
						break;
					case 'http:':
						this.connector = http
						break;
					default:
						throw new Error('Neither http nor https...')
				}

				console.log("now crawling:", this.dataset.url.href, new Date());

				//checking header for errors
				rp.head(this.dataset.url.href).then((header) => {

					this.saveFile()

				}).catch(async (error) => {
					console.error(error)
					this.dataset.errorCount++;
					this.dataset.crawlInterval = this.dataset.crawlInterval * 2
					this.dataset.nextCrawl = new Date().setSeconds(new Date().getSeconds() + (this.dataset.crawlInterval));
					if (this.dataset.errorCount >= errorCountTreshold) {
						this.dataset.stopped = true;
					};
					await this.dataset.save();
				})

			} catch (error) {
				this.dataset.stopped = true;
				this.dataset.errorCount++;
				await this.dataset.save();
				throw new Error('Stopping: ' + this.dataset.url.href);;
			}
		}
	}

	async checkHash() {

		if (this.dataset.nextVersionCount > 0) {
			let files = await db.file.find().getFilesByNameAndVersions(this.dataset.filename, this.dataset.nextVersionCount - 1, this.dataset.nextVersionCount)

			let oldFile = files[files.length - 2]
			let newFile = files[files.length - 1]

			if (oldFile.md5 != newFile.md5) {
				this.dataset.versions.push(newFile._id)
				this.dataset.nextVersionCount++;
				this.dataset.crawlInterval = this.dataset.crawlInterval / 2
				this.dataset.nextCrawl = new Date().setSeconds(new Date().getSeconds() + (this.dataset.crawlInterval));
				this.dataset.stopped = false;
				await this.dataset.save();
			} else {
				await db.bucket.delete(newFile._id).then(async () => {
					console.log('file deleted');
					this.dataset.crawlInterval = this.dataset.crawlInterval * 2
					this.dataset.nextCrawl = new Date().setSeconds(new Date().getSeconds() + (this.dataset.crawlInterval));
					this.dataset.stopped = false;
					await this.dataset.save();
				})
			}

		} else {
			let file = await db.file.findOne().getFileByVersion(this.dataset.filename, this.dataset.nextVersionCount);
			this.dataset.versions.push(file._id);
			this.dataset.nextVersionCount++;
			this.dataset.stopped = false;
			await this.dataset.save();
		}
	}

	async saveFile() {

		this.connector.get(this.dataset.url.href, (resp) => {

			pipeline(
				resp,
				db.bucket.openUploadStream(this.dataset.filename, {
					metadata: {
						version: this.dataset.nextVersionCount
					}
				}),
				async (error) => {
					if (!error) {

						await this.checkHash()

					} else {
						console.error(error)
						this.dataset.errorCount++;
						this.dataset.nextCrawl = new Date().setSeconds(new Date().getSeconds() + (this.secondsBetweenCrawls * 2));
						if (this.dataset.errorCount >= errorCountTreshold) {
							this.dataset.stopped = true;
						} else {
							this.dataset.stopped = false;
						}
						await this.dataset.save();
					}
				}
			);
		}).on("error", (error) => {
			console.log("Error: " + error.message);
		});
	}
}

module.exports = Crawler;