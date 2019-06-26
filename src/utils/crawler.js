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
import mongoose from 'mongoose';
const FileModel = require('../models/file');


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

					this.saveFile()

				}).catch(async (err) => {
					console.error(err)
					this.dataset.errorCount++;
					this.dataset.crawlInterval = this.dataset.crawlInterval * 2
					this.dataset.nextCrawl = new Date().setSeconds(new Date().getSeconds() + (this.dataset.crawlInterval));
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

	async checkHash(bucket) {

		if (this.dataset.nextVersionCount > 0) {
			let files = await FileModel.find({
				filename: this.dataset.filename
			}).or([{
				'metadata.version': this.dataset.nextVersionCount - 1
			}, {
				'metadata.version': this.dataset.nextVersionCount
			}]).exec();

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
				await bucket.delete(newFile._id).then(async () => {
					console.log('file deleted');
					this.dataset.crawlInterval = this.dataset.crawlInterval * 2
					this.dataset.nextCrawl = new Date().setSeconds(new Date().getSeconds() + (this.dataset.crawlInterval));
					this.dataset.stopped = false;
					await this.dataset.save();
				})
			}

		} else {
			let files = await FileModel.find({
				filename: this.dataset.filename
			}).and([{
				'metadata.version': this.dataset.nextVersionCount
			}]).exec();

			this.dataset.versions.push(files[0]._id)
			this.dataset.nextVersionCount++;
			this.dataset.stopped = false;
			await this.dataset.save();
		}
	}

	async saveFile() {

		let bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db)

		this.connector.get(this.dataset.url.href, (resp) => {

			pipeline(
				resp,
				bucket.openUploadStream(this.dataset.filename, {
					metadata: {
						version: this.dataset.nextVersionCount
					}
				}),
				async (err) => {
					if (!err) {

						this.checkHash(bucket)

					} else {
						console.error(err)
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
		}).on("error", (err) => {
			console.log("Error: " + err.message);
		});
	}
}

module.exports = Crawler;