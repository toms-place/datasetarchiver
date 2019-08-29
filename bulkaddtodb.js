const fs = require('fs');
const csv = require('csv-parser')
const db = require('./src/database').getInstance();

const {
	addManyHrefsToDB
} = require('./src/services/dataset')


db.connect().then(() => {

	for (let i = 0; i <= 24; i++) {

		let results = [];
		fs.createReadStream(`./europeandataportal/${i}.csv`)
			.pipe(csv())
			.on('data', (data) => results.push(data))
			.on('end', async () => {
				await addManyHrefsToDB(results)
				if (i == 24) {
					process.exit()
				}
			})
	}
});