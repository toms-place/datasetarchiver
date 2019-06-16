const rp = require('request-promise-native');
const sleep = require('util').promisify(setTimeout);
const zlib = require('zlib');
const fs = require('fs');
const {
	ungzip
} = require('node-gzip');
const DatasetModel = require('../models/dataset.js')

/** TODO
 * other change detection methods
 * dynamic crawling adjustment
 * is dataset compressed?
 * filetype detection
 * metadata generation
 */
class Crawler {
	constructor(url) {
		this.url = url;
		this.init = true;
		this.crawl();
	}

	async initPath() {
		const localPath = process.env.DATASETPATH || './data';

		let urlPathArray = this.url.split('/');
		let host = urlPathArray[2];
		let filename = urlPathArray[urlPathArray.length - 1];
		try {
			let dataset = await DatasetModel.findOne({
				url: this.url
			}).exec();

			dataset.host = host;
			dataset.filename = filename;
			dataset.path = localPath + "/" + host + "/" + filename;
			await dataset.save();

		} catch (error) {
			throw error
		}
	}

	async crawl() {
		if (this.init == true) {
			await this.initPath();
		}
		let dataset = await DatasetModel.findOne({
			url: this.url
		}).exec();

		if (dataset.stopped != true) {
			try {

				console.log("now crawling:", this.url, new Date());
				let header = await rp.head(this.url);


				//TODO other change detection methods
				if (header['last-modified'] != undefined && header['content-type'] != 'text/html') {

					let headerDate = new Date(header['last-modified'])

					if (headerDate - dataset.lastModified > 0 || dataset.nextVersionCount == 0) {
						dataset.lastModified = headerDate;
						await this.saveDataSet(dataset);
					}
				}

				this.init = false;

			} catch (error) {
				try {
					dataset.errorCount++;
					await dataset.save();

				} catch (error) {
					throw error
				}

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

	async saveDataSet(dataset, compressed) {
		try {
			await fs.promises.mkdir(dataset.path + "/" + dataset.nextVersionCount, {
				recursive: true
			}).catch(console.error);

			if (compressed == false) {
				await rp(this.url).pipe(fs.createWriteStream(dataset.path + "/" + dataset.nextVersionCount + "/" + dataset.filename));
			} else {
				let gzip = zlib.createGzip();
				await rp(this.url).pipe(gzip).pipe(fs.createWriteStream(dataset.path + "/" + dataset.nextVersionCount + "/" + dataset.filename + ".gz"));
			}

			dataset.versionPaths.push(dataset.path + "/" + dataset.nextVersionCount + "/" + dataset.filename + ".gz");
			dataset.nextVersionCount++;

			await dataset.save();

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