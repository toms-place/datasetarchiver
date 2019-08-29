const fs = require('fs');
const csv = require('csv-parser')
const db = require('./src/database').getInstance();

const {
	addManyHrefsToDB
} = require('./src/services/dataset')


db.connect().then(() => {

	let results = [];

	for (let i = 0; i <= 24; i++) {

		fs.createReadStream(`./europeandataportal/${i}.csv`)
			.pipe(csv())
			.on('data', (data) => results.push(data))
			.on('end', async () => {
				if (i == 24) {
					await bulk(results)
					process.exit()
				}
			})
	}
});

async function bulk(results) {
	let bulk = [];
	for (let i = 0; i < results.length; i++) {
		bulk.push(results[i])
		if (i%100 == 0) {
			await addManyHrefsToDB(bulk)
			bulk = []
		} else if (i == results.length - 1) {
			await addManyHrefsToDB(bulk)
			return
		}
	}
}