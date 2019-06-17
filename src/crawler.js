//From which number of errors should the crawling be stopped
const errorCountTreshold = 1;
const DatasetModel = require('../models/dataset.js')

const rp = require('request-promise-native');
const sleep = require('util').promisify(setTimeout);
const zlib = require('zlib');
const fs = require('fs');
const {
	ungzip
} = require('node-gzip');
const crypto = require('crypto');


/** TODO
 * - dynamic crawling adjustment
 * - is dataset compressed?
 * - filetype detection
 * - metadata generation
 */
class Crawler {
	constructor(url) {
		this.url = url;
		this.init = true;
		this.crawl();
	}

	async crawl() {
		let dataset = await DatasetModel.findOne({
			url: this.url
		}).exec();

		if (dataset.stopped != true) {
			try {

				console.log("now crawling:", this.url, new Date());
				let response = await rp(this.url).catch(async (error) => {
					dataset.errorCount++;
					let err = new Error('Error requesting: ' + this.url);
					err.code = error.statusCode;
					if (dataset.errorCount >= errorCountTreshold) {
						dataset.stopped = true;
					}
					await dataset.save();
					console.error(err);
				});

				if (response) {
					let hash = crypto.createHash('sha256');
					hash.update(response);
					let digest = hash.digest('hex');

					if (dataset.nextVersionCount == 0 || digest != dataset.versions[dataset.versions.length - 1].hash) {
						dataset.lastModified = new Date();
						await this.saveDataSet(dataset, response, digest);
					}
				}

				this.init = false;

			} catch (error) {
				dataset.stopped = true;
				dataset.errorCount++;
				await dataset.save();
				throw error;
			}
		}

		await sleep(dataset.waitingTime);
		this.crawl();
	}

	async quit() {
		try {
			let dataset = await DatasetModel.findOne({
				url: this.url
			}).exec();

			dataset.stopped = true;
			await dataset.save();

		} catch (error) {
			throw error
		}
	}

	async start() {
		try {
			let dataset = await DatasetModel.findOne({
				url: this.url
			}).exec();

			dataset.stopped = false;
			await dataset.save();
			this.crawl();

		} catch (error) {
			throw error
		}
	}

	async saveDataSet(dataset, data, digest, compressed) {
		try {

			await fs.promises.mkdir(dataset.path + "/" + dataset.nextVersionCount, {
				recursive: true
			}).catch(console.error);

			let path = dataset.path + "/" + dataset.nextVersionCount + "/" + dataset.filename;

			if (compressed == false) {
				fs.writeFile(path, data, async (err) => {
					if (err) throw err;
					dataset.versions.push({path: path, hash: digest})
					dataset.nextVersionCount++;
					await dataset.save();
				});
			} else {
				zlib.deflate(data, (err, buffer) => {
					if (!err) {
						fs.writeFile(path, buffer, async (err) => {
							if (err) throw err;
							dataset.versions.push({path: path + '.gz', hash: digest})
							dataset.nextVersionCount++;
							await dataset.save();
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
	}
}

module.exports = Crawler;