//From which number of errors should the crawling be stopped
const errorCountTreshold = 3;

const {
	pipeline
} = require('stream');
const rp = require('request-promise-native');
const zlib = require('zlib');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const https = require('https');


/** TODO
 * - header checking
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

					if (header['content-type']) {
						console.log(header['content-type'])
					}

					this.hashUrl()

				}).catch(async (err) => {
					console.error(err)
					this.dataset.errorCount++;
					this.dataset.nextCrawl = new Date().setSeconds(new Date().getSeconds() + (this.secondsBetweenCrawls * 2));
					if (this.dataset.errorCount >= errorCountTreshold) {
						this.dataset.stopped = true;
					};
					await this.dataset.save();
				})

			} catch (error) {
				let err = new Error('Stopping: ' + this.dataset.url.href);
				console.error(err)
				this.dataset.stopped = true;
				this.dataset.errorCount++;
				await this.dataset.save();
				throw error;
			}
		}
	}

	hashUrl() {
		let hash = crypto.createHash('sha1').setEncoding('hex');

		this.connector.get(this.dataset.url.href, (resp) => {
			pipeline(
				resp,
				hash,
				async (err) => {
					if (err) {
						console.error(err)
						this.dataset.errorCount++;
						this.dataset.nextCrawl = new Date().setSeconds(new Date().getSeconds() + (this.secondsBetweenCrawls * 2));
						if (this.dataset.errorCount >= errorCountTreshold) {
							this.dataset.stopped = true;
						};
						await this.dataset.save();
					} else {
						hash.end()
						this.checkHash(hash.read())
					}
				}
			);
		}).on("error", (err) => {
			console.log("Error: " + err.message);
		});
	}

	async checkHash(hashValue) {
		if (this.dataset.nextVersionCount == 0 || hashValue != this.dataset.versions[this.dataset.versions.length - 1].hash) {
			this.dataset.lastModified = new Date();
			this.dataset.crawlInterval = this.dataset.crawlInterval / 2;
			this.dataset.nextCrawl = new Date().setSeconds(new Date().getSeconds() + this.dataset.crawlInterval);
			//stop crawling while saving the dataset (in case of large dataset)
			this.dataset.stopped = true;
			await this.dataset.save();
			this.saveFile(hashValue);
		} else {
			this.dataset.crawlInterval = this.dataset.crawlInterval * 2;
			this.dataset.nextCrawl = new Date().setSeconds(new Date().getSeconds() + this.dataset.crawlInterval);
			await this.dataset.save();
		}
		console.log('hashing done')
	}


	async saveFile(hashValue) {
		try {

			await fs.promises.mkdir(this.dataset.storage.root + "/" + this.dataset.storage.path + "/" + this.dataset.nextVersionCount, {
				recursive: true
			}).catch(console.error);

			let storage = {
				root: this.dataset.storage.root,
				path: this.dataset.storage.path + "/" + this.dataset.nextVersionCount + "/" + this.dataset.storage.filename + ".gz"
			}

			this.connector.get(this.dataset.url.href, (resp) => {
				pipeline(
					resp,
					zlib.createGzip(),
					fs.createWriteStream(storage.root + "/" + storage.path),
					async (err) => {
						if (err) {
							console.error(err)
							this.dataset.errorCount++;
							this.dataset.nextCrawl = new Date().setSeconds(new Date().getSeconds() + (this.secondsBetweenCrawls * 2));
							if (this.dataset.errorCount >= errorCountTreshold) {
								this.dataset.stopped = true;
							};
							await this.dataset.save();
						} else {
							this.dataset.versions.push({
								storage: storage,
								hash: hashValue
							})
							this.dataset.nextVersionCount++;
							this.dataset.stopped = false;
							await this.dataset.save();
							console.log('saved');
						}
					}
				);
			}).on("error", (err) => {
				console.log("Error: " + err.message);
			});

		} catch (error) {
			let err = new Error('Stopping: ' + this.dataset.url.href);
			console.error(err)
			this.dataset.stopped = true;
			this.dataset.errorCount++;
			await this.dataset.save();
			throw error;
		}
	}
}

module.exports = Crawler;