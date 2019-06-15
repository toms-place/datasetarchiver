const rp = require('request-promise-native');
const sleep = require('util').promisify(setTimeout);
const zlib = require('zlib');
const fs = require('fs');
const {
	ungzip
} = require('node-gzip');
const DatasetModel = require('../models/dataset.js')

class Crawler {
	constructor(url) {
		this.url = url;
		this.tempLastModified;
		this.init();
		this.crawl();
	}

	init() {
		let urlPathArray = this.url.split('/');
		let host = urlPathArray[2];
		let filename = urlPathArray[urlPathArray.length - 1];

		const localPath = process.env.DATASETPATH || './data'

		DatasetModel
			.findOneAndUpdate({
				url: this.url
			}, {
				host: host,
				filename: filename,
				path: localPath + "/" + host + "/" + filename
			}, {
				runValidators: true // validate before update
			}).then(() => {
				console.log(`initiated: ${this.url}`)
			})
			.catch(err => {
				console.error(err)
			})
	}

	async crawl() {
		let dataset = await DatasetModel.findOne({
			url: this.url
		}).exec();

		if (dataset.stopped != true) {
			try {

				console.log("now crawling:", this.url, new Date());
				let header = await rp.head(this.url);

				this.tempLastModified = dataset.lastModified;

				//TODO other change detection methods
				if (header['last-modified'] != undefined && header['content-type'] != 'text/html') {

					DatasetModel
						.findOneAndUpdate({
							url: this.url
						}, {
							lastModified: new Date(header['last-modified'])
						}, {
							new: true,
							runValidators: true // validate before update
						}).then(async (dataset) => {
							if (this.tempLastModified - dataset.lastModified != 0) {
								this.saveDataSet();
							}

							await sleep(dataset.waitingTime);
							this.crawl();

						})
						.catch(err => {
							console.error(err)
						})
				}

			} catch (error) {
				DatasetModel
					.findOneAndUpdate({
						url: this.url
					}, {
						errorCount: dataset.errorCount + 1
					}, {
						new: true,
						runValidators: true // validate before update
					}).then((dataset) => {
						console.log(`(errorCount: ${dataset.errorCount}) Error crawling: ${this.url}`);
					})
					.catch(err => {
						console.error(err)
					})
				throw error;
			}
		}
	}

	quit() {
		DatasetModel
			.findOneAndUpdate({
				url: this.url
			}, {
				stopped: true
			}, {
				runValidators: true // validate before update
			}).then(() => {
				console.log(`Stopped crawling: ${this.url}`)
			})
			.catch(err => {
				console.error(err)
			})
	}

	start() {
		DatasetModel
			.findOneAndUpdate({
				url: this.url
			}, {
				stopped: false
			}, {
				runValidators: true // validate before update
			})
			.then(() => {
				this.crawl();
			})
			.catch(err => {
				throw err
			})
	}

	async saveDataSet(compressed) {
		let dataset = await DatasetModel.findOne({
			url: this.url
		}).exec();

		await fs.promises.mkdir(dataset.path + "/" + dataset.versionCount, {
			recursive: true
		}).catch(console.error);

		if (compressed == false) {
			await rp(this.uril).pipe(fs.createWriteStream(dataset.path + "/" + dataset.versionCount + "/" + dataset.filename));
		} else {
			let gzip = zlib.createGzip();
			await rp(this.url).pipe(gzip).pipe(fs.createWriteStream(dataset.path + "/" + dataset.versionCount + "/" + dataset.filename + ".gz"));
		}

		DatasetModel
			.findOneAndUpdate({
				url: this.url
			}, {
				versionCount: dataset.versionCount + 1
			}, {
				runValidators: true // validate before update
			})
			.catch(err => {
				console.error(err)
			})
	}

	static async uncompressDataSet(host, filename, version) {
		console.log(`Get ${this.url}`);
		const folder = './data/' + host + "/" + filename + "/v" + version;
		let path2file = './data/' + host + "/" + filename + "/v" + version + "/" + filename + ".gz";

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