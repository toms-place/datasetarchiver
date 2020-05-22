import L from '../utils/logger'
import db from '../utils/database'
import { QueryCursor } from 'mongoose'
import { IDataset } from '../models/dataset'
import { IFile } from '../models/file'
import FileTypeDetector from '../utils/fileTypeDetector'

export default class ApiService {
	static getVersionStreamsByArray(array: Array<string>) {
		const cursor = db.file.find({_id: {$in: array}}).cursor()
		let filetype: FileTypeDetector = null

		return { async * [Symbol.asyncIterator]() {
			//let dataset: IDataset;
			for await (const f of cursor) {
				const file: IFile = f
				filetype = new FileTypeDetector(file.metadata.filetype)
				//@ts-ignore
				const downloadStream = db.bucket.openDownloadStream(file._id)
				yield {
					stream: downloadStream,
					id: String(file.id),
					meta: file.metadata,
					extension: filetype.extension
				}
			}
		}
		}
	}
	static getDatasetsByHostname(arg0: string): QueryCursor<IDataset> {
		throw new Error('Method not implemented.')
	}
	static getVersionStreams() {

		const cursor = db.file.find().cursor()
		let filetype: FileTypeDetector = null

		return { async * [Symbol.asyncIterator]() {
			for await (const file of cursor) {
				const downloadStream = db.bucket.openDownloadStream(file._id)
				filetype = new FileTypeDetector(file.metadata.filetype)
				yield {
					stream: downloadStream,
					id: String(file._id),
					meta: file.metadata,
					extension: filetype.extension
				}
			}
		}
		}

	}
	static getVersionStreamsByTag(arg0: string): any {
		throw new Error('Method not implemented.')
	}

	static getVersionStreamsByType(mimeType: string, extension: string) {
		const cursor = db.file.find({
			'metadata.filetype': mimeType
		}).cursor()

		return { async * [Symbol.asyncIterator](): AsyncGenerator {
			for await (const file of cursor) {
				const downloadStream = db.bucket.openDownloadStream(file._id)
				yield {
					stream: downloadStream,
					id: String(file._id),
					meta: file.metadata,
					extension: extension
				}
			}
		}
		}


	}

	static getDatasetsByTag(tag: string): QueryCursor<IDataset> {
		throw new Error('Method not implemented.')
	}

	static getDatasetsByFileType(extension: string): QueryCursor<IDataset> {
		const array = db.dataset.find({
			$or: [{
				'meta.filetype': extension
			}, {
				'meta.extension': extension
			}]
		}).cursor({transform: JSON.stringify})
		return array
  
	}
  
	static getDatasets(): QueryCursor<IDataset> {
		const cursor = db.dataset.find({}).cursor({transform: JSON.stringify})
		return cursor
  
	}
}