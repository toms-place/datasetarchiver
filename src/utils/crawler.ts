import request from 'request'
import rp from 'request-promise-native'
import contentDisposition from 'content-disposition'
import db from '../utils/database'
import {
	IDataset
} from '../models/dataset'
import config from '../config'
import fileTypeDetector from './fileTypeDetector'
import l from '../utils/logger'
import {
	Socket
} from 'net'


export class DatasetError extends Error {
	message: string;
	code: number;
	constructor(message: string, code: number) {
		super()
		this.message = message
		this.code = code
	}
}

/** TODO
 * - is dataset compressed?
 * - filetype detection
 * - metadata generation
 */
export default class Crawler {
	url: URL;
	agent: any
	dataset: IDataset;
	downloadStart: Date;

	constructor(dataset: IDataset) {
		this.dataset = dataset
	}

	async crawl(): Promise < boolean > {

		try {

			await this.download()

			//update file meta per file
			const file = await db.file.find().getFileByVersion(this.dataset._id, this.dataset.meta.versionCount)
			file.metadata.filetype = this.dataset.meta.filetype
			file.metadata.dataset_ref_url = this.dataset.id
			await file.save()

			const hasChanged = await this.checkHash()
			this.calcNextCrawl(hasChanged)

			this.dataset.crawl_info.firstCrawl = false
			this.dataset.crawl_info.currentlyCrawled = false
			await this.dataset.save()
			await db.host.releaseHost(this.dataset.url.hostname)
			//await this.populate_sparql_endpoint()
			return true

		} catch (error) {
			try {
				this.dataset.crawl_info.firstCrawl = false
				this.dataset.crawl_info.currentlyCrawled = false
				this.addError(error)
				this.calcNextCrawl(false)
				await this.dataset.save()
				await db.host.releaseHost(this.dataset.url.hostname)
				return false
			} catch (error) {
				l.error('DB saving Error:', error)
				return false
			}
		}


	}
	async populate_sparql_endpoint() {
		const file = await db.file.findOne({_id: this.dataset.versions[this.dataset.versions.length - 1]})

		try {
			await rp.get(`https://archiver.ai.wu.ac.at/sparql?default-graph-uri=&query=PREFIX+csvw:+<http://www.w3.org/ns/csvw#> PREFIX+dcat:+<http://www.w3.org/ns/dcat#> PREFIX+dc:+<http://purl.org/dc/elements/1.1/> INSERT+INTO+<https://archiver.ai.wu.ac.at/graph>+{ 
				${encodeURI(this.dataset.id)}+dcat:mediaType+"${this.dataset.meta.filetype}"+. 
				${encodeURI(this.dataset.id)}+dc:title+"${this.dataset.meta.filename}"+. 
				${encodeURI(this.dataset.id)}+dc:hasVersion+${encodeURI('https:archiver.ai.wu.ac.at/api/v1/get/file/id/' + file._id)}+. 
				${encodeURI('https://archiver.ai.wu.ac.at/api/v1/get/file/id/' + file._id)}+dc:identifier+"${file.md5}"+;+dc:issued+"${file.uploadDate}"^^xsd:dateTime+;+dcat:byteSize+${file.length}+. 
			} WHERE+{+} &should-sponge=&format=text/html&timeout=0&debug=on&run=+Run+Query+
			`)
			
		} catch (error) {
			l.error(error)
		}

	}
	/** TODO
	 * - follow redirects
	 * - save redirect status
	 * - fileHandler?
	 */
	async download(): Promise < boolean > {

		return new Promise((resolve, reject) => {

			this.downloadStart = new Date()
			let dataByteCount = 0
			let socket: Socket
			let pipe: request.Request
			const uploadStream = db.bucket.openUploadStreamWithId(`${this.dataset._id}_${this.dataset.meta.versionCount}`, String(this.dataset._id), {
				metadata: {
					dataset_ref_id: this.dataset._id,
					version: this.dataset.meta.versionCount
				}
			})
			const detector = new fileTypeDetector()
			detector.on('file-type', (filetype) => {
				if (filetype != null) {
					this.dataset.meta.filetype = filetype.mime
					this.dataset.meta.extension = filetype.ext
				}
			})

			try {
				pipe = request(this.dataset.url.href, {
					followAllRedirects: true,
					maxRedirects: 5,
					rejectUnauthorized: false,
					headers: {
						'User-Agent': 'datasetarchiver/1.2.3'
					},
					timeout: config.CRAWL_timeout,
					gzip: true,
					jar: true,
					time: true
				})
			} catch (error) {
				reject(error)
			}

			pipe
				.on('error', (error) => {reject(error)})
				.on('response', (response) => {
					socket = response.socket
					try {
						this.checkHeaders(response.headers)
						const code = Number(response.statusCode)

						if (code >= 400 && code < 500) {
						//unpipe
							pipe.removeAllListeners()
							pipe.destroy()

							/*
							* TODO PULL REQUEST TYPES MONGODB ABORT
							* here I abort the bucket stream to delete the already saved chunks
							*/

							//@ts-ignore
							uploadStream.abort(() => {
								console.log('aborted', response.statusCode, response.statusMessage)
								//unpipe other pipe listeners
								detector.removeAllListeners()
								detector.destroy()
								//destroy the request socket
								socket.destroy()
								//finally reject error
								reject(new DatasetError(response.statusMessage, response.statusCode))
							})
						}

					} catch (error) {
						reject(error)
					}


					this.dataset.meta.meanResponseTime = this.calcTime(this.dataset.meta.meanResponseTime)

				})
				.on('data', (data) => {
				//count byteLength in advance to destroy request if file too large
					dataByteCount += Buffer.byteLength(data)
					if (dataByteCount >= config.MaxFileSizeInBytes) {
					//unpipe
						pipe.removeAllListeners()
						pipe.destroy()

						/*
						* TODO PULL REQUEST TYPES MONGODB ABORT
						* here I abort the bucket stream to delete the already saved chunks
						*/

						//@ts-ignore
						uploadStream.abort(() => {
							console.log('aborted filesize')
							//unpipe other pipe listeners
							detector.removeAllListeners()
							detector.destroy()
							//destroy the request socket
							socket.destroy()
							//finally reject error
							reject(new DatasetError('max file size exceeded', 194))
						})
					}
				})
				.on('complete', () => {
				//console.log(response.elapsedTime)
				//console.log(response.timings)
				//console.log(response.timingPhases)
				})
				.pipe(detector)
				.on('error', (error) => {
					reject(error)
				})
				.pipe(uploadStream)
				.on('error', (error) => {
					reject(error)
				})
				.on('finish', () => {
					this.dataset.meta.meanDownloadTime = this.calcTime(this.dataset.meta.meanDownloadTime)
					resolve(true)
				})

		})

	}

	calcTime(timeKeeper: number) {

		const downloadTime = new Date().getTime() - this.downloadStart.getTime()
		if (timeKeeper != 0) {
			timeKeeper = (timeKeeper + downloadTime) / 2
		} else {
			timeKeeper = downloadTime
		}
		return timeKeeper

	}

	async checkHash(): Promise < boolean > {

		if (this.dataset.meta.versionCount > 0) {

			const oldFile = await db.file.find().getFileByVersion(this.dataset._id, this.dataset.meta.versionCount - 1)
			const newFile = await db.file.find().getFileByVersion(this.dataset._id, this.dataset.meta.versionCount)

			if (newFile.length <= config.MaxFileSizeInBytes) {

				if (oldFile.md5 != newFile.md5) {
					//new file saved
					this.dataset.versions.push(newFile._id)
					this.dataset.meta.versionCount++
					this.dataset.crawl_info.stopped = false
					return true
				} else {
					//delete not new file

					await new Promise((resolve, reject) => {
						//@ts-ignore
						db.bucket.delete(newFile._id, (error) => {
							if (!error) resolve()
							else reject(error)
						})
					})

					return false
				}
			} else {

				await new Promise((resolve, reject) => {
					//@ts-ignore
					db.bucket.delete(newFile._id, (error) => {
						if (!error) resolve()
						else reject(error)
					})
				})
				this.dataset.crawl_info.stopped = true
				throw new DatasetError('max file size exceeded', 194)

			}

		} else {
			//in case there is no existing file
			const file = await db.file.findOne().getFileByVersion(this.dataset._id, this.dataset.meta.versionCount)
			if (file.length > config.MaxFileSizeInBytes) {
				await new Promise((resolve, reject) => {
					//@ts-ignore
					db.bucket.delete(file._id, (error) => {
						if (!error) resolve()
						else reject(error)
					})
				})
				this.dataset.versions = []
				this.dataset.crawl_info.stopped = true
				throw new DatasetError('max file size exceeded', 194)
			} else {
				this.dataset.versions.push(file._id)
				this.dataset.meta.versionCount++
			}
			return true
		}

	}

	calcNextCrawl(hasChanged = false): void {

		//get time since last crawl
		const now = new Date().getTime()
		let interval = (now - this.dataset.crawl_info.lastCrawlAttempt.getTime()) / 1000 //to get seconds

		//only add changeDistripution if file is downloaded
		if (!this.dataset.crawl_info.firstCrawl) {
			this.dataset.crawl_info.changeDistribution.push({
				newFile: hasChanged,
				interval: interval
			})
		}

		//make calculation only after second download
		if (this.dataset.crawl_info.changeDistribution.length > 1) {

			//prevent infinite array
			if (this.dataset.crawl_info.changeDistribution.length > config.CRAWL_DistributionArrayMax) {
				this.dataset.crawl_info.changeDistribution.shift()
			}

			//reduce to changes between files [ 1000100100101000 --> 43324 (1 change; 0 nochange; output = time between) ]
			const intervalBetweenNewFiles = this.dataset.crawl_info.changeDistribution.reduce((acc, curr) => {
				if (curr.newFile == true || acc.length == 0) {
					acc.push(curr.interval)
				} else {
					acc[acc.length - 1] += curr.interval
				}
				return acc
			}, [])

			//sum up change time
			const sum = intervalBetweenNewFiles.reduce(function (a, b) {
				return a + b
			})

			//TODO make it better than average haha
			interval = sum / intervalBetweenNewFiles.length

		}

		//reduce crawl time by 2 times if it has changed
		if (hasChanged) interval /= 2

		//check if intervall is in defined range
		if (interval > config.CRAWL_maxRange) {
			interval = config.CRAWL_maxRange
		} else if (interval < config.CRAWL_minRange) {
			interval = config.CRAWL_minRange
		}

		//set new crawl time
		this.dataset.crawl_info.crawlInterval = interval
		this.dataset.crawl_info.nextCrawl = new Date(now + interval * 1000)
		//set this time as last crawl time
		this.dataset.crawl_info.lastCrawlAttempt = new Date(now)
		return

	}

	/** TODO
	 * - metadata generation
	 */
	checkHeaders(headers: import('http').IncomingHttpHeaders): void {

		const detector = new fileTypeDetector()

		if (parseInt(headers['content-length']) > config.MaxFileSizeInBytes) {
			this.dataset.crawl_info.stopped = true
			throw new DatasetError('max file size exceeded', 194)
		}

		try {
			this.dataset.meta.filename = contentDisposition.parse(headers['content-disposition']).parameters.filename
		} catch (error) {
			this.dataset.meta.filename = this.dataset.url.pathname.split('/')[this.dataset.url.pathname.split('/').length - 1]
		}

		try {
			detector.setMimeType(headers['content-type'].split(';')[0])
			if (detector.mimeType == '' || detector.extension == '') {
				const fileSplit = this.dataset.meta.filename.split('.')
				detector.setExtension((fileSplit.length > 1) ? fileSplit[fileSplit.length - 1] : '')
			}
			this.dataset.meta.filetype = detector.mimeType
			this.dataset.meta.extension = detector.extension
		} catch (error) {
			l.error(error)
		}


		return

	}

	/** TODO
	 * - get specific errors
	 * - error codes
	 * - look in request object
	 */
	addError(error: { code: any; message: string }) {

		try {

			let statusCode: number

			switch (error.code) {
			case 'ETIMEDOUT':
				statusCode = 114
				break
			case 'ESOCKETTIMEDOUT':
				statusCode = 114
				break
			case 'ENOTFOUND':
				statusCode = 404
				break
			case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
				l.info(`UNABLE_TO_VERIFY_LEAF_SIGNATURE ${error} ${this.dataset.id}`)
				statusCode = 112
				break
			case 194:
				this.dataset.crawl_info.stopped = true
				statusCode = 194
				break
			default:
				statusCode = Number(error.code)
				if (isNaN(statusCode)) statusCode = 111
				l.error(`default error: ${error} ${this.dataset.id}`)
				break
			}

			const err = new DatasetError(error.message, statusCode)
			this.dataset.crawl_info.errorStore.push(err)
			this.dataset.crawl_info.errorCount++

			// Do not stop crawling, just shift the treshold array
			if (this.dataset.crawl_info.errorCount >= config.ErrorCountTreshold) {
				this.dataset.crawl_info.errorStore.shift()
			}

		} catch (error) {
			l.error(`addError ${error} ${this.dataset.id}`)
		}

	}

}