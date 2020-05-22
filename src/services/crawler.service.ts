import db from '../utils/database'
import config from '../config'
import fileTypeDetector from '../utils/fileTypeDetector'
import {
	IDataset
} from '../models/dataset'
import {
	ISource
} from '../models/source'
import {
	IHost
} from '../models/host'
import {
	ObjectId
} from 'mongodb'
import {
	QueryCursor
} from 'mongoose'
import Crawler from '../utils/crawler'
import robotsParser from 'robots-parser'
import L from '../utils/logger'
import rp from 'request-promise-native'

export interface IResource {
  href: URL['href'];
  source? : URL['href'];
  format? : string;
  title? : string;
  portal? : string;
}

export class CrawlerService {
	count: number;
	constructor() {
		this.count = 0
	}

	async setRobotsTXT(hostname: string) {
		const robots_url = 'http://' + hostname + '/robots.txt'
		let robots_txt = ''
		try {
			robots_txt = await rp(robots_url, {
				followAllRedirects: true
			})

			await db.host.updateOne({
				name: hostname
			}, {
				$set: {
					'robots_txt': robots_txt,
					'robots_url': robots_url
				}
			})

		} catch (error) {
			L.error(error)
		}

	}

	async crawl(id: URL['href'], hostname: string) {

		try {
			if (this.count < config.CRAWL_asyncCount) {
				++this.count

				const host = await db.host.lockHost(hostname)
				if (!host) {
					L.error(`Host not found: ${hostname}`)
					--this.count
					return false
				}

				if (host.robots_txt == '') {
					await this.setRobotsTXT(hostname)
				}

				const dataset = await db.dataset.lockDataset(id)
				if (!dataset) {
					await db.host.releaseHost(hostname)
					L.error(`Dataset not found: ${id}`)
					--this.count
					return false
				}

				const robots = robotsParser(dataset.url.origin, host.robots_txt)
				const notAllowed = robots.isDisallowed(dataset.url.href, 'datasetarchiver/1.0')
				if (notAllowed) {
					await db.dataset.releaseDataset(id)
					await db.host.releaseHost(hostname)
					L.error(`not allowed to crawl: ${notAllowed}`)
					--this.count
					return false
				}

				const crawler = new Crawler(dataset)
				await crawler.crawl()
				--this.count
				return true
			} else {
				return false
			}

		} catch (error) {
			--this.count
			throw error
		}
	}

	static async addResources(resources: IResource[]): Promise < any > {
		const datasets: IDataset[] = []
		let dataset: IDataset
		let url: URL
		let source: ISource

		for (const resource of resources) {

			try {
				url = new URL(resource.href)
				//index key length max = 1024 bytes
				if (Buffer.byteLength(url.href, 'utf8') >= 512 || url.href.length >= 512) {
					continue
				}
			} catch (error) {
				continue
			}

			try {
				const src = new URL(resource.source)
				source = new db.source({
					href: src.href,
					origin: src.origin,
					protocol: src.protocol,
					username: src.username,
					password: src.password,
					host: src.host,
					hostname: src.hostname,
					port: src.port,
					pathname: src.pathname,
					search: src.search,
					hash: src.hash,
					meta: undefined
				})

				//index key length max = 1024 bytes
				if (Buffer.byteLength(source.href, 'utf8') >= 512 || source.href.length >= 512) source = undefined
			} catch (error) {
				source = undefined
			}


			dataset = new db.dataset({
				url: url,
				id: url.href,
				meta: {
					title: resource.title,
					references: undefined
				},
				crawl_info: undefined
			})

			if (!(url.protocol == 'http:' || url.protocol == 'https:')) {
				dataset.crawl_info.stopped = true
			}

			const detector = new fileTypeDetector(resource.format)
			dataset.meta.filetype = detector.mimeType
			dataset.meta.extension = detector.extension

			const javaHashCode = (str: string) => {
				let hash = 0,
					i, chr
				for (i = 0; i < str.length; i++) {
					chr = str.charCodeAt(i)
					hash = ((hash << 5) - hash) + chr
					hash |= 0 // Convert to 32bit integer
				}
				return hash
			}

			try {
				dataset.meta.references = {
					[javaHashCode(resource.portal)]: {
						urls: [resource.source],
						name: resource.portal
					}
				}
			} catch (error) {
				L.error(error)
			}

			if (source) {
				try {
					await source.save()
					dataset.meta.source.push(source._id)
				} catch (error) {
					if (error.code == 11000) {
						source = await db.source.findOne({
							href: source.href
						})
						if (source) dataset.meta.source.push(source._id)
					} else {
						L.error(error)
					}
				}
			}

			datasets.push(dataset)

		}
		const numberAdded = await db.dataset.addMany(datasets)
		return numberAdded

	}

	static async addHosts(hosts: IHost[]) {
		let insertedHosts = 0

		try {
			const hostRes = await db.host.insertMany(hosts, {
				ordered: false,
				//@ts-ignore
				forceServerObjectId: true
			})
			insertedHosts = hostRes.length
		} catch (error) {
			if (error.code == 11000) {
				L.info('duplication error')
				insertedHosts = error.result.result.nInserted - error.result.result.writeErrors.length
			} else {
				L.error('insert many hosts', error)
			}
		}
		return insertedHosts

	}

	static async getAllVersionsOfDatasetAsStream(href: string) {
		const url = new URL(href)
		const dataset = await db.dataset.findOne({
			url: url
		})
		const versions = []
		for (const version of dataset.versions) {
			//@ts-ignore
			const downloadStream = db.bucket.openDownloadStream(version)
			versions.push(downloadStream)
		}
		return versions

	}

	static async getAllVersionIDsByFileType(extension: string) {
		const array = await db.dataset.aggregate([{
			$match: {
				$and: [{
					$or: [{
						'meta.filetype': extension
					}, {
						'meta.extension': extension
					}]
				},
				{
					'meta.versionCount': {
						$gt: 0
					}
				}
				]
			}
		}, {
			$project: {
				file_ids: '$versions',
				dataset_id: '$_id',
				dataset_url: '$id',
				meta: '$meta',
				_id: 0
			}
		}])
		return array

	}


	static async getAllVersionIDs() {
		const array = await db.dataset.aggregate([{
			$match: {
				'meta.versionCount': {
					$gt: 0
				}
			}
		}, {
			$project: {
				file_ids: '$versions',
				dataset_id: '$_id',
				meta: '$meta',
				_id: 0
			}
		}])
		return array

	}


	static async getDataset(id: ObjectId) {
		const ds = await db.dataset.findOne({
			_id: new ObjectId(id)
		})
		return ds
	}

	static async getDatasetByUrl(url: URL['href']): Promise < IDataset > {
		const ds = await db.dataset.findOne({
			id: url
		}).populate('versions').populate('meta.source')
		return ds
	}

	static async getDatasetByUrl_forFile(href: URL['href']): Promise < IDataset > {
		const ds = await db.dataset.findOne({
			id: href
		}).populate('versions').select({
			crawl_info: 0,
			source: 0,
			url: 0
		})
		return ds
	}

	static async getDatasetById_forFile(_id: ObjectId): Promise < IDataset > {
		const ds = await db.dataset.findOne({
			_id: _id
		}).populate('versions').select({
			crawl_info: 0,
			source: 0,
			url: 0
		})
		return ds
	}

	static async getDatasetsByHostnameAsStream(hostname: URL['hostname']): Promise < QueryCursor < IDataset > > {

		const source = await db.source.find({
			hostname: hostname
		}).select({
			_id: 1
		})
		if (source.length == 0) throw new Error('no source found!')
		const ds = db.dataset.find({
			'meta.source': {
				$in: source
			}
		}).populate('meta.source').populate('versions').cursor()

		/*
		let ds = await db.dataset.aggregate([{
			$unwind: "$meta.source"
			}, {
			$lookup: {
				from: 'sources',
				localField: 'meta.source',
				foreignField: '_id',
				as: 'meta.source'
			}
			}, {
			$match: {
				'meta.source.hostname': 'www.data.gv.at'
			}
			}, {
			$group: {
				_id: '$_id',
				'meta': {
				$first: '$meta'
				},
				'versions': {
				$first: '$versions'
				},
				'sources': {
				$push: '$meta.source'
				},
				'url': {
				$first: '$url'
				},
				'crawl_info': {
				$first: '$crawl_info'
				}
			}
			},
			{
			$lookup: {
				from: 'datasets.files',
				localField: 'versions',
				foreignField: '_id',
				as: 'versions'
			}
			}, {
			$project: {
				'meta.source': {
				$reduce: {
					input: "$sources",
					initialValue: [],
					in: {
					$concatArrays: ["$$value", "$$this"]
					}
				}
				},
				"meta.versionCount": 1,
				"meta.filename": 1,
				"meta.filetype": 1,
				"meta.extension": 1,
				"meta.insertDate": 1,
				"meta.meanDownloadTime": 1,
				"meta.meanSavingTime": 1,
				'versions': 1,
				'url': 1,
				'crawl_info': 1,
				'id': 1
			}
			}
		]).allowDiskUse(true)

		*/
		return ds
	}


	static async getFile(_id: string) {
		const file = await db.file.findOne({
			_id: _id
		})
		return file
	}

	static getFileAsStream(id: string) {
		//@ts-ignore
		const downloadStream = db.bucket.openDownloadStream(id)
		return downloadStream
	}



}

export default CrawlerService