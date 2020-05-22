import {
	Request,
	Response,
	NextFunction
} from 'express'
import rp from 'request-promise-native'
import { QueryCursor } from 'mongoose'
import { IDataset } from '../models/dataset'
import fileTypeDetector from '../utils/fileTypeDetector'
import ApiService from '../services/api.service'
import archiver from 'archiver'

export default class Controller {
	static async getFilesBySparql(req: Request, res: Response, next: NextFunction): Promise < void >  {
		try {
			const graphuri = process.env.graphuri || 'http://localhost:8890/sparql'
			if (req.query.q) {
				const query = encodeURIComponent(String(req.query.q))
				let sparql_res = await rp.get(`${graphuri}?format=json&query=${query}`)
				sparql_res = JSON.parse(sparql_res)
				let sparql_key = null
				const checkUri = (uri: string): boolean => {
					const uri_items = uri.split('/')
					if (uri_items[uri_items.length - 3] == 'file' && uri_items[uri_items.length - 2] == 'id') return true
					else return false
				}
				for (const key in sparql_res.results.bindings[0]) {
					if (sparql_res.results.bindings[0][key].type == 'uri' && checkUri(sparql_res.results.bindings[0][key].value)) {
						sparql_key = key
					}
				}
				const versions = []

				for (const binding of sparql_res.results.bindings) {
					versions.push(binding[sparql_key].value.split('/').pop())
				}

				res.type('application/zip')
			
				const archive = archiver('zip')
				archive.on('error', function(err) {
					throw err
				})
				archive.pipe(res)
			
				res.header('Content-disposition', 'attachment; filename=odarchiver.zip')
					
				for await (const file of ApiService.getVersionStreamsByArray([...new Set(versions)])) {
					archive.append(file.stream, {name: `${file.id}.${file.extension}`})
				}
				archive.finalize()
			} else {
				throw new Error('define a query')
			}

		} catch (error) {
			next(error)
			return
		}
	}
	static async getDatasets(req: Request, res: Response, next: NextFunction): Promise < void > {
		try {
			let filetype: fileTypeDetector
			let cursor: QueryCursor<IDataset>
			let by: string
			if (req.params.by) by = req.params.by.toLowerCase()
    
			switch (by) {
			case 'type':
				filetype = new fileTypeDetector(String(req.url.split(req.params.by + '/')[1]))
				if (!filetype.extension) {
					next(new Error('wrong filetype'))
					return
				}
				cursor = ApiService.getDatasetsByFileType(filetype.extension)
				break
          
			case 'hostname':
				cursor = ApiService.getDatasetsByHostname(String(req.url.split(req.params.by + '/')[1]))
				break

			case 'tag':
				cursor = ApiService.getDatasetsByTag(String(req.url.split(req.params.by + '/')[1]))
				break
          
			default:
				cursor = ApiService.getDatasets()
				break
			}
      
			//
			let stringToSend = '['
			res.type('json')
			for await (const doc of cursor) {
				res.write(stringToSend)
				stringToSend = doc + ','
			}
			if (stringToSend == '[') throw new Error('nothing found...')
			res.write(stringToSend.slice(0,-1) + ']')
			res.end()
			return
          
		} catch (error) {
			next(error)
			return
		}
	}
	static async getFilesByArray(req: Request, res: Response, next: NextFunction): Promise < void > {
		try {
			res.type('application/zip')
	
			const archive = archiver('zip')
			archive.on('error', function(err) {
				throw err
			})
			archive.pipe(res)
	
			res.header('Content-disposition', 'attachment; filename=odarchiver.zip')


			if (req.body['payload']) req.body = req.body['payload'].split(',')
			
			for await (const file of ApiService.getVersionStreamsByArray(req.body)) {
				const filetype = new fileTypeDetector(file.meta.filetype)
				archive.append(file.stream, {name: `${file.id}.${filetype.extension}`})
			}
			archive.finalize()
		} catch (error) {
			next(error)
			return
		}
	}

	static async getFiles(req: Request, res: Response, next: NextFunction): Promise < void > {
		try {
			let generator
			let filetype: fileTypeDetector
			let by: string
			if (req.params.by) by = req.params.by.toLowerCase()

			const archive = archiver('zip')
			archive.on('error', function(err) {
				throw err
			})

			switch (by) {
			case 'type':
				filetype = new fileTypeDetector(String(req.url.split(req.params.by + '/')[1]))
				if (!filetype.extension) {
					throw new Error('wrong filetype')
				}
				res.header('Content-disposition', `attachment; filename=${filetype.extension}.zip`)
				generator = ApiService.getVersionStreamsByType(filetype.mimeType, filetype.extension)
				break
			
			case 'tag':
				generator = ApiService.getVersionStreamsByTag(String(req.url.split(req.params.by + '/')[1]))
				break
			
			default:
				//generator = ApiService.getVersionStreams()
				throw new Error('nothing defined')
			}

			res.type('application/zip')
			archive.pipe(res)
			for await (const version of generator) {
				archive.append(version.stream, {name: version.id + '.' +  version.extension})
			}
			archive.finalize()
          
		} catch (error) {
			next(error)
			return
		}
	}
}