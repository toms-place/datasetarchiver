import fs from 'fs';
import csv from 'csv-parser';
import db from './server/common/database';
import FileTypeDetector from './server/utils/fileTypeDetector'
import {
	IDataset
} from './server/apps/api/models/dataset';

const fileCount = 24;
const batchAmount = 10;

db.conn.on('connected', async () => {

	let results = [];

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

	console.log('Total inserted', results.length)

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