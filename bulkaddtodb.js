const fs = require('fs');
const csv = require('csv-parser')
const sleep = require('util').promisify(setTimeout);

const {
  addUrlToDB
} = require('./src/services/dataset')

for (let i = 1; i <= 24; i++) {

	let results = [];
	fs.createReadStream(`./europeandataportal/${i}.csv`)
		.pipe(csv())
		.on('data', (data) => results.push(data))
		.on('end', async () => {
			for (let result of results) {

				let response = await addUrlToDB(result.url, result.dataset);
				await sleep(0.1);

				console.log(response)

			}
		});
}