const rp = require('request-promise-native');
const sleep = require('util').promisify(setTimeout);
const zlib = require('zlib');
const fs = require('fs');
const {
	ungzip
} = require('node-gzip');


/**
 * TODO:
 *	- versionCounter in DB!!!
 *	- errorCount in DB
 *	- waitingTime in DB
 *	- lastModified in DB
 */
class Crawler {
	constructor(url) {
		this.uri = url;
		this.tempLastModified;
		this.lastModified = new Date();
		this.waitingTime = 10000;
		this.errorCount = 0;
		this.verisionCount = 0;
		this.stopped = false;
		this.crawl();
	}

	async crawl() {
		try {
			console.log("start", new Date());
			let header = await rp.head({
				uri: this.uri
			});

			this.tempLastModified = this.lastModified;

			if (header['last-modified'] != undefined && header['content-type'] != 'text/html') {
				this.lastModified = new Date(header['last-modified']);
			} else {
				//TODO: define other change detection methods!
			}
			if (this.tempLastModified - this.lastModified != 0) {
				let requestpathArray = this.uri.split('/');
				let host = requestpathArray[2];
				let filename = requestpathArray[requestpathArray.length - 1];
				this.saveDataSet(host, filename);
			}

			await sleep(this.waitingTime);
			if (this.stop != true) {
				this.crawl();
			}

		} catch (error) {
			this.errorCount++;
			console.log(`(errorCount: ${this.errorCount}) Error crawling: ${this.uri}`);
			throw error;
		}
	}

	stop() {
		this.stopped = true;
	}

	start() {
		this.stop = false;
		this.crawl();
	}

	async saveDataSet(host, filename, compressed) {

		let folder = './data/' + host + "/" + filename + "/v" + this.verisionCount;

		await fs.promises.mkdir(folder, {
			recursive: true
		}).catch(console.error);

		if (compressed == false) {
			rp(this.uri).pipe(fs.createWriteStream(folder + "/" + filename + ".gz"));
		} else {
			let gzip = zlib.createGzip();
			rp(this.uri).pipe(gzip).pipe(fs.createWriteStream(folder + "/" + filename + ".gz"));
		}

		this.verisionCount++;
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

		this.verisionCount++;
	}
}

module.exports = Crawler;