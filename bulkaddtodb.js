const fs = require('fs');
const csv = require('csv-parser')
const db = require('./src/database').getInstance();
const sleep = require('util').promisify(setTimeout);

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
					bulk(results)
				}
			})
	}
});

async function bulk(results) {
	let bulk = [];
	for (let i = 0; i < results.length; i++) {
		try {
			bulk.push(results[i])
			if (i%1000 == 0) {
				let added = await addManyHrefsToDB(bulk)
				console.log(i, added.length)
				bulk = []
				await sleep(10000);
			} else if (i == results.length - 1) {
				let added = await addManyHrefsToDB(bulk)
				console.log(i, added.length)
				process.exit()
			}
			
		} catch (error) {
			console.log(error)
		}
	}
}