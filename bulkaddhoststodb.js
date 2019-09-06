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
						await addHosts(batch)
					}
				}
			})
	}
});

function batch(results) {
	let batches = [];
	count = 0;
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

function addHosts(batch) {
	let urls = [];
	for (let line of batch) {
		urls.push(line.url)
	}


	let datasets = db.dataset.find({
		id: {
			$in: urls
		}
	});

	try {

		let ids = [];

		for (let dataset of datasets) {
			ids.push(dataset.id)
		}

		let insertedDatasets = await db.dataset.find({
			id: {
				$in: ids
			}
		})

		for (let insertedDataset of insertedDatasets) {
			await db.host.updateOne({
				name: url.hostname
			}, {
				$push: {
					datasets: insertedDataset._id
				}
			}, {
				upsert: true,
				setDefaultsOnInsert: true
			})

		}

	} catch (error) {
		console.log(error.message)
	}
}