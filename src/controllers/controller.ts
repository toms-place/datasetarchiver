import {
	CrawlerService,
	IResource
} from '../services/crawler.service'
import {
	Request,
	Response,
	NextFunction
} from 'express'
import L from '../utils/logger'
import {
	isArray
} from 'util'
import Archiver from 'archiver'
import fileTypeDetector from '../utils/fileTypeDetector'
import config from '../config'
import {
	Readable
} from 'stream'
//import bcrypt from 'bcrypt';
import {
	ObjectId
} from 'mongodb'
import Server from '../index'
import { QueryCursor } from 'mongoose'
import { IDataset } from '../models/dataset'
import { IFile } from '../models/file'

async function batch(data: IResource[]): Promise<any[][]> {
	const batches = []
	let count = 0
	batches[count] = []
	for (let i = 0; i < data.length; i++) {
		try {
			batches[count].push(data[i])
			if (i != 0 && i % config.batchAmount == 0) {
				count++
				batches[count] = []
			}
		} catch (error) {
			console.log(error)
		}
	}

	return batches
}

export class Controller {
	async crawl(req: Request, res: Response, next: NextFunction): Promise < void > {
		let match
		try {
			//match = await bcrypt.compare(req.query.secret, config.secret)
			match = req.query.secret == config.pass
		} catch (error) {
			L.error(error)
		}
		if (req.query._id && req.query.hostname && match) {
			let _id: ObjectId
			try {
				_id = new ObjectId(String(req.query.id))
			} catch (error) {
				next(error)
				return
			}
			try {
				const r = await Server.crawlerService.crawl(String(req.query.url), String(req.query.hostname))
				res.json({
					crawling: r,
					_id: _id
				})
			} catch (error) {
				next(error)
				return
			}
		} else {
			next(new Error(`${JSON.stringify(req.query)} not found`))
		}
	}


	async file(req: Request, res: Response, next: NextFunction): Promise < void > {
		let flag = true
		let file: IFile
		let detector: fileTypeDetector
		let ds: IDataset
		let newReqUrl
		let by
		if (req.params.by) by = req.params.by.toLowerCase()
		try {
			switch (by) {
			case 'id':
				flag = false
				file = await CrawlerService.getFile(req.url.split(req.params.by + '/')[1])
				if (!file) throw new Error('no file found')
				if (!file.metadata.filetype) {
					file.metadata.filetype = 'text/plain'
				}
				detector = new fileTypeDetector(file.metadata.filetype)
				res.type(file.metadata.filetype)
				res.header('Content-disposition', `attachment; filename=${file._id}.${detector.extension}`)
				CrawlerService.getFileAsStream(file._id).pipe(res)
				break

			case 'dsid':
				flag = false
				ds = await CrawlerService.getDatasetById_forFile(new ObjectId(req.url.split(req.params.by + '/')[1]))
				if (!ds || ds.versions.length == 0) throw new Error('no file found')

				if (!ds.meta.filename) {
					ds.meta.filename = String(ds._id)
				}
				if (!ds.meta.filetype) {
					ds.meta.filetype = 'text/plain'
				}
				if (!ds.meta.extension) {
					ds.meta.extension = 'txt'
				}

				res.type(ds.meta.filetype)
				res.header('Content-disposition', `attachment; filename=${ds.meta.filename}.${ds.meta.extension}`);
				//@ts-ignore
				CrawlerService.getFileAsStream(ds.versions[ds.versions.length - 1]._id).pipe(res)
				break
			case 'url':
				//transform req.url to be able to parse
				newReqUrl = req.url.split('/file/url/')
				req.url = newReqUrl[0] + '/file/' + newReqUrl[1]
				break
			default:
				break
			}

			//default
			if (flag) {
				const param = req.url.split('/file/')[1]
				const url: URL = new URL(decodeURIComponent(param))
				const ds = await CrawlerService.getDatasetByUrl_forFile(url.href)
				if (!ds || ds.versions.length == 0) throw new Error('no file found')

				if (!ds.meta.filename) {
					ds.meta.filename = String(ds._id)
				}
				if (!ds.meta.filetype) {
					ds.meta.filetype = 'text/plain'
				}
				if (!ds.meta.extension) {
					ds.meta.extension = 'txt'
				}

				res.type(ds.meta.filetype)
				res.header('Content-disposition', `attachment; filename=${ds.meta.filename}.${ds.meta.extension}`)
				//@ts-ignore
				CrawlerService.getFileAsStream(ds.versions[ds.versions.length - 1]._id).pipe(res)
			}
		} catch (error) {
			next(error)
		}

	}


	async dataset(req: Request, res: Response, next: NextFunction): Promise < void > {
		let flag = true
		let ds: IDataset
		let newReqUrl
		let by
		if (req.params.by) by = req.params.by.toLowerCase()
		try {
			switch (by) {
			case 'id':
				flag = false
				ds = await CrawlerService.getDataset(new ObjectId(req.url.split(req.params.by + '/')[1]))
				res.json(ds)
				break
			case 'url':
				//transform req.url to be able to parse
				newReqUrl = req.url.split('/dataset/url/')
				req.url = newReqUrl[0] + '/dataset/' + newReqUrl[1]
				break
			default:
				break
			}

			//default
			if (flag) {
				const param = req.url.split('/dataset/')[1]
				const url = new URL(decodeURIComponent(param))
				const ds = await CrawlerService.getDatasetByUrl(url.href)
				res.json(ds)
			}
		} catch (error) {
			next(error)
		}

	}








	async getFile(req: Request, res: Response, next: NextFunction): Promise < void > {
		let zip: Archiver.Archiver
		let detector: fileTypeDetector
		//check query
		if (req.query.id) {
			try {

				const file = await CrawlerService.getFile(String(req.query.id))
				if (!file) next(new Error('no file found'))
				const stream = await CrawlerService.getFileAsStream(file._id)

				switch (req.query.as) {
				case 'zip':
					if (!file.filename) {
						file.filename = file.md5
					}
					zip = Archiver('zip')
					res.type('application/zip')
					res.header('Content-disposition', `attachment; filename=${file.filename}.zip`)
					zip.pipe(res)
					zip.append(stream, {
						name: file.filename
					})
					zip.finalize()
					break

				case 'file':
					if (!file.filename) {
						file.filename = file.md5
					}
					if (!file.metadata.filetype) {
						file.metadata.filetype = 'text/plain'
					}
					detector = new fileTypeDetector(file.metadata.filetype)
					res.type(file.metadata.filetype)
					res.header('Content-disposition', `attachment; filename=${file.filename}.${detector.extension}`)
					stream.pipe(res)
					break

				default: //stream
					res.type('application/octet-stream')
					stream.pipe(res)
					break
				}

			} catch (error) {
				next(error)
				return
			}
		} else {
			next(new Error('not found'))
			return
		}
	}


	async getFileByUrl(req: Request, res: Response, next: NextFunction): Promise < void > {
		//check query
		let param = req.url.split('/file/')[1]

		let url: URL

		try {
			url = new URL(param)
		} catch (error) {
			try {
				param = decodeURIComponent(param)
				url = new URL(param)
			} catch (error) {
				next(new Error('url not correct'))
				return
			}
		}

		try {

			const ds = await CrawlerService.getDatasetByUrl(url.href)

			if (!ds) {
				next(new Error('no dataset found'))
				return
			} else if (ds.versions.length <= 0) {
				next(new Error('no version found'))
				return
			}

			const stream = await CrawlerService.getFileAsStream(ds.versions[ds.versions.length - 1])

			if (!ds.meta.filename) {
				ds.meta.filename = String(ds._id)
			}
			if (!ds.meta.filetype) {
				ds.meta.filetype = 'noType'
			}
			if (!ds.meta.extension) {
				ds.meta.extension = 'noExtension'
			}
			res.type(ds.meta.filetype)
			res.header('Content-disposition', `attachment; filename=${ds.meta.filename}.${ds.meta.extension}`)
			stream.pipe(res)

		} catch (error) {
			next(error)
			return
		}
	}


	async getDatasetByUrl(req: Request, res: Response, next: NextFunction): Promise < void > {
		//check query
		let param = req.url.split('/dataset/')[1]

		let url: URL

		try {
			url = new URL(param)
		} catch (error) {
			try {
				param = decodeURIComponent(param)
				url = new URL(param)
			} catch (error) {
				next(new Error('url not correct'))
			}
		}

		try {

			const ds = await CrawlerService.getDatasetByUrl(url.href)
			if (!ds) {
				next(new Error('no dataset found'))
				return
			}

			res.json(ds)

		} catch (error) {
			next(error)
			return
		}
	}



	async getDatasetsByHostname(req: Request, res: Response, next: NextFunction): Promise < void > {
		try {

			const s = new Readable()
			let flag = true
			let tempStreamStore: string[] = []

			// eslint-disable-next-line @typescript-eslint/no-empty-function
			s._read = () => {};

			(await CrawlerService.getDatasetsByHostnameAsStream(req.params.hostname)).on('data', function (doc) {
				if (flag) {
					s.push('[')
					flag = false
				}
				tempStreamStore.push(JSON.stringify(doc))
				//to truncate last comma
				if (tempStreamStore.length % 3 == 0) {
					for (const stream of tempStreamStore) {
						s.push(stream)
					}
					tempStreamStore = []
				}
				tempStreamStore.push(',')
			})
				.on('end', function () {
					//truncate last comma
					if (tempStreamStore[tempStreamStore.length - 1] == ',') {
						tempStreamStore.pop()
						for (const stream of tempStreamStore) {
							s.push(stream)
						}
					}
					if (flag == true) s.push('[')
					s.push(']')
					s.push(null)
				})

			res.type('application/json')
			res.header('Content-disposition', `attachment; filename=datasets_of_${req.params.hostname}.json`)
			s.pipe(res)

		} catch (error) {
			next(error)
		}
	}


	async getVersions(req: Request, res: Response, next: NextFunction): Promise < void > {
		//check query
		if (req.query.byType) {
			try {
				const filetype = new fileTypeDetector(String(req.query.byType))
				if (!filetype.extension) {
					return next(new Error('wrong filetype'))
				}
				const array = await CrawlerService.getAllVersionIDsByFileType(filetype.extension)
				res.json(array)

			} catch (error) {
				next(error)
				return
			}
		} else {
			const array = await CrawlerService.getAllVersionIDs()
			res.json(array)
		}
	}

	async getDataset(req: Request, res: Response, next: NextFunction): Promise < void > {
		//check query
		if (req.query.id) {
			try {
				const ds = await CrawlerService.getDataset(new ObjectId(String(req.query.id)))
				res.json(ds)
			} catch (error) {
				next(error)
				return
			}
		} else {
			next(new Error('not found'))
			return
		}
	}


	async addResources(req: Request, res: Response, next: NextFunction): Promise < void > {
		let match
		let resp = []
		//todo make it local passport
		try {
			//match = await bcrypt.compare(req.query.secret, config.secret)
			match = req.query.secret == config.pass
		} catch (error) {
			L.error(error)
		}
		if (req.body && match) {
			try {
				if (isArray(req.body)) {
					const batches = await batch(req.body)
					for (const batch of batches) {
						resp.push(CrawlerService.addResources(batch))
					}
					resp = await Promise.all(resp)
				} else {
					const error = new Error('no array')
					next(error)
					return
				}
				res.json(resp)
			} catch (error) {
				console.log(error)
				next(error)
				return
			}
		} else {
			next(new Error('not found'))
			return
		}
	}

}


export default new Controller()



//@ts-ignore
String.prototype.hexEncode = function(){
	let hex, i

	let result = ''
	for (i=0; i<this.length; i++) {
		hex = this.charCodeAt(i).toString(16)
		result += ('000'+hex).slice(-4)
	}

	return result
}