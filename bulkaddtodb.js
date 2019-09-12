const fs = require('fs');
const csv = require('csv-parser')
const db = require('./src/database').getInstance();
const sleep = require('util').promisify(setTimeout);

const {
	addManyHrefsToDB
} = require('./src/services/dataset')


db.conn.on('connected', () => {

	let results = [];

	for (let i = 0; i <= 24; i++) {

		fs.createReadStream(`./europeandataportal/${i}.csv`)
			.pipe(csv())
			.on('data', (data) => results.push(data))
			.on('end', async () => {
				if (i == 24) {
					let batches = await batch(results)
					for (let batch of batches) {
						await addManyHrefsToDB(batch)
					}
				}
			})
	}
});

function batch(results) {
	let batches = [];
	let count = 0;
	batches[count] = [];
	for (let i = 0; i < results.length; i++) {
		try {
			batches[count].push(results[i])
			if (i % 100 == 0) {
				count++;
				batches[count] = [];
			}
		} catch (error) {
			console.log(error)
		}
	}
	return batches
}