import rp from 'request-promise-native'
import db from '../utils/database'
import { SchedulerService } from '../services/scheduler.service'
import dataset, { IDataset  } from '../models/dataset'
import { ISource } from '../models/source'
import { IFile } from '../models/file'

const graphuri = process.env.graphuri || 'https://archiver.ai.wu.ac.at/sparql'

async function populate_csv_meta(_id: string) {
	//@ts-ignore
	const data = db.bucket.openDownloadStream(_id)
	let csv = ''
	for await (const chunk of data) {
		csv += chunk
	}
	let res = await rp.post('https://data.wu.ac.at/csvengine/api/v1/profiler/', {
		'headers': {
			'Accept': 'application/json',
			'Content-Type': 'multipart/form-data',
		},
		'formData': {
			'csv_file': {
				value:  csv,
				options: {
					filename: '5e85fbd1eb9fc287399a4f15_0.csv',
					contentType: 'text/csv'
				}
			} 
		}
	})
	res = JSON.parse(res)
	let columns = ''
	const header = (res.header.length > 0) ? true : false
	if (header) {
		for (let i = 0; i < res.header.length; i++) {
			const version_url = encodeURIComponent(`https://archiver.ai.wu.ac.at/api/v1/get/file/id/${_id}#${i}`)
			columns += `_:schema csvw:column <${encodeURIComponent(version_url)}> . <${encodeURIComponent(version_url)}> csvw:name "${res.header[i]}" ; csvw:datatype "${res.types[i]}" .`
		}
	}

	await rp(`${graphuri}?format=json&query=
			PREFIX csvw: <${encodeURIComponent('http://www.w3.org/ns/csvw#')}>
			PREFIX dcat: <${encodeURIComponent('http://www.w3.org/ns/dcat#')}>
			PREFIX dc: <${encodeURIComponent('http://purl.org/dc/elements/1.1')}>
			INSERT {
				GRAPH <${encodeURIComponent('https://archiver.ai.wu.ac.at/graph')}> {
					_:csv csvw:url <${encodeURIComponent('https://archiver.ai.wu.ac.at/api/v1/get/file/id/' + _id)}> .
					_:csv csvw:dialect _:dialect .
					_:dialect csvw:encoding "${res.encoding}" ; csvw:delimiter "${res.delimiter}" ; csvw:header ${header} .
					_:csv csvw:tableSchema _:schema .
					${columns}
				}
			}
		`)
}

async function populate_source_meta(source: ISource, ds: IDataset, file: IFile) {
	try {
		const res = await rp(`${graphuri}?format=json&query=
			PREFIX csvw: <${encodeURIComponent('http://www.w3.org/ns/csvw#')}>
			PREFIX dcat: <${encodeURIComponent('http://www.w3.org/ns/dcat#')}>
			PREFIX dc: <${encodeURIComponent('http://purl.org/dc/elements/1.1')}>
			INSERT {
				GRAPH <${encodeURIComponent('https://archiver.ai.wu.ac.at/graph')}> {
					<${encodeURIComponent(source.href)}> dcat:accessURL "${encodeURIComponent(ds.id)}" .
					<${encodeURIComponent(ds.id)}> dcat:mediaType "${ds.meta.filetype}" .
					<${encodeURIComponent(ds.id)}> dc:title "${ds.meta.filename}" .
					<${encodeURIComponent(ds.id)}> dc:hasVersion <${encodeURIComponent('https://archiver.ai.wu.ac.at/api/v1/get/file/id/' + file._id)}> .
					<${encodeURIComponent('https://archiver.ai.wu.ac.at/api/v1/get/file/id/' + file._id)}> dc:identifier "${file.md5}" ; dc:issued "${file.uploadDate.toISOString()}" ; dcat:byteSize ${file.length} .
				}
			}
		`)
		console.info(JSON.parse(res).results.bindings[0]['callret-0'].value)
	} catch (error) {
		console.error(error.message)
	}
}



export default async (): Promise<void> => {


	let count = 0
	let processed = parseInt(process.env.sparql_bulk_start) || 0
	let files_processed = 0


	while (true) {

		try {
			const dataset_cursor = db.dataset.find({
				$where: 'this.versions.length > 0'
			}).sort({_id:1}).skip(processed).populate('meta.source').cursor()
	
			//@ts-ignore
			dataset_cursor.addCursorFlag('noCursorTimeout', true)

			for await (const dataset of dataset_cursor) {
				const ds: IDataset = dataset
				const files = db.file.find({
					_id: {
						$in: ds.versions
					}
				}).sort('_id').skip(files_processed).cursor()
				for await (const file of files) {
					count++
					if (process.env.USE_CSVENGINE) {
						if (ds.meta.extension == 'csv' || ds.meta.extension == 'CSV') {
							try {
								await populate_csv_meta(file._id)
							} catch (error) {
								console.log('CSV')
								console.error(error.message)
							}
						}
					}
					for (const source of ds.meta.source) await populate_source_meta(source, ds, file)
					++files_processed
				}
				files_processed = 0
				++processed
				console.log('Already Processed: ' + processed)
			}

			break //done processing
		
		} catch (error) {
			console.error(error)
			console.log('Already Processed: ' + processed)
		}

	}

	console.info('Version Count: ' + count)
	//SchedulerService.start()
}