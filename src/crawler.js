//From which number of errors should the crawling be stopped
const errorCountTreshold = 3;
const DatasetModel = require('../models/dataset.js')

const rp = require('request-promise-native');
const sleep = require('util').promisify(setTimeout);
const zlib = require('zlib');
const fs = require('fs');
const crypto = require('crypto');


/** TODO
 * - dynamic crawling adjustment
 * - is dataset compressed?
 * - filetype detection
 * - metadata generation
 */
class Crawler {
	constructor(dataset) {
		this.url = dataset.url;
		this.dataset = dataset;
		this.crawl();
	}

	async crawl() {
		this.dataset = await DatasetModel.findOne({
			url: this.url
		}).exec();

		if (this.dataset.stopped != true) {
			try {

				console.log("now crawling:", this.url, new Date());
				let response = await rp(this.url).catch(async (error) => {
					this.dataset.errorCount++;
					let err = new Error('Error requesting: ' + this.url);
					err.code = error.statusCode;
					if (this.dataset.errorCount >= errorCountTreshold) {
						this.dataset.stopped = true;
					}
					await this.dataset.save();
					console.error(err);
				});

				if (response) {
					let hash = crypto.createHash('sha256');
					hash.update(response);
					let digest = hash.digest('hex');

					if (this.dataset.nextVersionCount == 0 || digest != this.dataset.versions[this.dataset.versions.length - 1].hash) {
						this.dataset.lastModified = new Date();
						await this.saveDataSet(response, digest);
					}
				}

			} catch (error) {
				let err = new Error('Error crawling! Stopping: ' + this.url);
				console.error(err)
				this.dataset.stopped = true;
				this.dataset.errorCount++;
				await this.dataset.save();
				throw error;
			}
		}

		await sleep(this.dataset.waitingTime);
		this.crawl();
	}

	async saveDataSet(data, digest, compressed) {
		try {

			await fs.promises.mkdir(this.dataset.path + "/" + this.dataset.nextVersionCount, {
				recursive: true
			}).catch(console.error);

			let path = this.dataset.path + "/" + this.dataset.nextVersionCount + "/" + this.dataset.filename;

			if (compressed == false) {
				fs.writeFile(path, data, async (err) => {
					if (err) throw err;
					this.dataset.versions.push({path: path, hash: digest})
					this.dataset.nextVersionCount++;
					await this.dataset.save();
				});
			} else {
				zlib.gzip(data, (err, buffer) => {
					if (!err) {
						fs.writeFile(path + '.gz', buffer, async (err) => {
							if (err) throw err;
							this.dataset.versions.push({path: path + '.gz', hash: digest})
							this.dataset.nextVersionCount++;
							await this.dataset.save();
						});
					} else {
						throw err
					}
				});
			}


		} catch (error) {
			throw error
		}
	}

	/*
	static async uncompressDataSet(host, filename, version) {
		const localPath = process.env.DATASETPATH || './data';

		const folder = localPath + "/" + host + "/" + filename + "/v" + version;
		let path2file = folder + "/" + filename + ".gz";

		fs.readFile(path2file, async function (err, file) {
			if (err) {
				console.error(err);
			} else {
				console.log('Read successfull');
				const uncompressed = await ungzip(file);

				//
				fs.writeFile(folder + "/uncompressed_" + filename, uncompressed, function (err) {
					if (err) {
						console.error(err);
					} else {
						console.log('Write successfully');
					}
				});
			}
		});
	}*/
}

module.exports = Crawler;