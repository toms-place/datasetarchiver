const rp = require('request-promise-native');
const sleep = require('util').promisify(setTimeout);
const zlib = require('zlib');
const fs = require('fs');
const {
	ungzip
} = require('node-gzip');
const DatasetModel = require('../models/dataset.js')

class Crawler {
	constructor(uri) {
		this.uri = uri;
		this.tempLastModified;
		this.init();
		this.crawl();
	}

	init() {
		let uriPathArray = this.uri.split('/');
		let host = uriPathArray[2];
		let filename = uriPathArray[uriPathArray.length - 1];

		const localPath = process.env.DATASETPATH || './data'

		DatasetModel
			.findOneAndUpdate({
				uri: this.uri
			}, {
				host: host,
				filename: filename,
				path: localPath + "/" +  host + "/" + filename
			}, {
				runValidators: true // validate before update
			}).then(() => {
				console.log(`initiated: ${this.uri}`)
			})
			.catch(err => {
				console.error(err)
			})
	}

	async crawl() {
		let dataset = await DatasetModel.findOne({
			uri: this.uri
		}).exec();

		if (dataset.stopped != true) {
			try {

				console.log("now crawling:", this.uri, new Date());
				let header = await rp.head({
					uri: this.uri
				});

				this.tempLastModified = dataset.lastModified;

				//TODO other change detection methods
				if (header['last-modified'] != undefined && header['content-type'] != 'text/html') {

					DatasetModel
						.findOneAndUpdate({
							uri: this.uri
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
						uri: this.uri
					}, {
						errorCount: dataset.errorCount + 1
					}, {
						new: true,
						runValidators: true // validate before update
					}).then((dataset) => {
						console.log(`(errorCount: ${dataset.errorCount}) Error crawling: ${this.uri}`);
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
				uri: this.uri
			}, {
				stopped: true
			}, {
				runValidators: true // validate before update
			}).then(() => {
				console.log(`Stopped crawling: ${this.uri}`)
			})
			.catch(err => {
				console.error(err)
			})
	}

	start() {
		DatasetModel
			.findOneAndUpdate({
				uri: this.uri
			}, {
				stopped: false
			}, {
				runValidators: true // validate before update
			}).then(() => {
				this.crawl();
			})
			.catch(err => {
				console.error(err)
			})
	}

	async saveDataSet(compressed) {
		let dataset = await DatasetModel.findOne({
			uri: this.uri
		}).exec();

		await fs.promises.mkdir(dataset.path + "/" + dataset.versionCount, {
			recursive: true
		}).catch(console.error);

		if (compressed == false) {
			rp(this.uri).pipe(fs.createWriteStream(dataset.path + "/" + dataset.versionCount + "/" + dataset.filename));
		} else {
			let gzip = zlib.createGzip();
			rp(this.uri).pipe(gzip).pipe(fs.createWriteStream(dataset.path + "/" + dataset.versionCount + "/" + dataset.filename + ".gz"));
		}

		DatasetModel
			.findOneAndUpdate({
				uri: this.uri
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
		console.log(`Get ${this.uri}`);
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