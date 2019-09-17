import fs from 'fs';
import csv from 'csv-parser';
import db from './server/common/database';
import FileTypeDetector from './server/utils/fileTypeDetector'
import {
	IDataset
} from './server/api/models/dataset';

const fileCount = 24;
const batchAmount = 10;

db.conn.on('connected', async () => {

	let results = [];
	let insertedTotal = 0;

	await new Promise < any > ((resolve, reject) => {
		for (let i = 0; i <= fileCount; i++) {
			fs.createReadStream(`./europeandataportal/${i}.csv`)
				.pipe(csv())
				.on('data', (data) => results.push(data))
				.on('end', async () => {
					if (i == fileCount) {
						resolve()
					}
				})
		}
	})

	let batches = batch(results)

	for (let batch of batches) {
		let datasets: IDataset[] = []

		for (let i = 0; i < batch.length; i++) {

			try {
				let url = new URL(batch[i].url)

				//index key length max = 1024 bytes
				if (Buffer.byteLength(url.href, 'utf8') > 1024) {
					continue;
				}

				let dataset = new db.dataset({
					url: url,
					id: url.href,
					meta: undefined,
					crawl_info: undefined
				});

				if (batch[i].format) {
					let detector = new FileTypeDetector(batch[i].format, batch[i].format)
					dataset.meta.filetype = detector.mimeType
					dataset.meta.extension = detector.extension
				}

				if (batch[i].dataset) {
					dataset.meta.source.push(new URL(batch[i].dataset))
				}

				datasets.push(dataset)

			} catch (error) {
				console.error('mongoose db class', error.message)
			}

		}

		let insertCount = await db.dataset.addMany(datasets)
		insertedTotal += insertCount
		console.log('inserted', insertCount)
	}

	console.log('Total inserted', insertedTotal)

	process.exit()


})


function batch(results) {
	let batches = [];
	let count = 0;
	batches[count] = [];
	for (let i = 1; i < results.length; i++) {
		try {
			batches[count].push(results[i])
			if (i % batchAmount == 0) {
				count++;
				batches[count] = [];
			}
			if (i == results.length - 1) {
				batches[count].push(results[0])
			}
		} catch (error) {
			console.log(error)
		}
	}

	return batches
}