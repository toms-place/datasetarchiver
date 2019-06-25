//From which number of errors should the crawling be stopped
const errorCountTreshold = 3;

const {
	pipeline
} = require('stream');
const request = require('request');
const rp = require('request-promise-native');
const zlib = require('zlib');
const fs = require('fs');
const crypto = require('crypto');

/** TODO
 * - crawlrate?!
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

				console.log("now crawling:", this.dataset.url, new Date());

				let hash = crypto.createHash('sha1').setEncoding('hex');

				//check header for errors
				rp.head(this.dataset.url).then(() => {

					pipeline(
						request(this.dataset.url),
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
								if (this.dataset.nextVersionCount == 0 || hash.read() != this.dataset.versions[this.dataset.versions.length - 1].hash) {
									this.dataset.lastModified = new Date();
									this.dataset.crawlInterval = this.dataset.crawlInterval / 2;
									this.dataset.nextCrawl = new Date().setSeconds(new Date().getSeconds() + this.dataset.crawlInterval);
									//stop crawling while saving the dataset (in case of large dataset)
									this.dataset.stopped = true;
									await this.dataset.save();
									this.saveDataSet(this.dataset.url, hash.read());
								} else {
									this.dataset.crawlInterval = this.dataset.crawlInterval * 2;
									this.dataset.nextCrawl = new Date().setSeconds(new Date().getSeconds() + this.dataset.crawlInterval);
									await this.dataset.save();
								}
								console.log('hashing done')
							}
						}
					);

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
				let err = new Error('Stopping: ' + this.dataset.url);
				console.error(err)
				this.dataset.stopped = true;
				this.dataset.errorCount++;
				await this.dataset.save();
				throw error;
			}
		}
	}


	async saveDataSet(url, hash, compressed) {
		try {

			await fs.promises.mkdir(this.dataset.storage.root + "/" + this.dataset.storage.path + "/" + this.dataset.nextVersionCount, {
				recursive: true
			}).catch(console.error);

			let storage = {
				root: this.dataset.storage.root,
				path: this.dataset.storage.path + "/" + this.dataset.nextVersionCount + "/" + this.dataset.storage.filename
			}

			if (compressed != true) {

				storage.path += ".gz"

				pipeline(
					request(url),
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
								hash: hash
							})
							this.dataset.nextVersionCount++;
							this.dataset.stopped = false;
							await this.dataset.save();
							console.log('saved');
						}
					}
				);

			} else {

				pipeline(
					request(url),
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
								hash: hash
							})
							this.dataset.nextVersionCount++;
							this.dataset.stopped = false;
							await this.dataset.save();
							console.log('saved')
						}
					}
				);
			}

		} catch (error) {
			let err = new Error('Stopping: ' + this.dataset.url);
			console.error(err)
			this.dataset.stopped = true;
			this.dataset.errorCount++;
			await this.dataset.save();
			throw error;
		}
	}
}

module.exports = Crawler;