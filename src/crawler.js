const debuglevel = 0;

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
 * - hash speichern
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

	async crawl() {
		let dataset = await DatasetModel.findOne({
			url: this.url
		}).exec();

		if (dataset.stopped != true) {
			try {

				console.log("now crawling:", this.url, new Date());
				let header = await rp.head(this.url).catch((error) => {
					if (error.statusCode == (400 || 404)) {
						err = new Error('Ressource not found');
						err.code = 404;
						throw err;
					}
				});

				//TODO other change detection methods
				if (header) {
					if (header['last-modified'] != undefined && header['content-type'] != 'text/html') {

						let headerDate = new Date(header['last-modified'])

						if (headerDate - dataset.lastModified > 0 || dataset.nextVersionCount == 0) {
							dataset.lastModified = headerDate;
							await this.saveDataSet(dataset);
						}
					}
				}

				this.init = false;

			} catch (error) {
				if (error.code == 404 && dataset.errorCount < debuglevel) {
					dataset.errorCount++;
					await dataset.save();
					await sleep(dataset.waitingTime);
					this.crawl();
				} else {
					dataset.stopped = true;
					await dataset.save();
					throw error;
				}
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