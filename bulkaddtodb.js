const fs = require('fs');
const csv = require('csv-parser')
const db = require('./src/database').getInstance();
const sleep = require('util').promisify(setTimeout);

const {
	addHrefToDB
} = require('./src/services/dataset')


db.connect().then(() => {

	for (let i = 0; i <= 24; i++) {

		let results = [];
		fs.createReadStream(`./europeandataportal/${i}.csv`)
			.pipe(csv())
			.on('data', (data) => results.push(data))
			.on('end', async () => {

				for (let result of results) {

					try {
						let response = await addHrefToDB(result.url, result.dataset, '', result.format);
						console.log(response)
						await sleep(100);
						
					} catch (error) {
						console.error(error)
					}

				}

				if (i == 24) {
					process.exit()
				}

			})
	}
});