const db = require('./src/database').getInstance();

db.conn.on('connected', async () => {
	await addHosts()
	process.exit()
});

async function addHosts() {

	
	await db.host.remove({}, function (err) {
		console.log('host removed')
	});

	let datasets = await db.dataset.find({}, {'url.hostname':1});

	try {

		console.log(datasets)

		let res;
		for (let dataset of datasets) {
			res = await db.host.updateOne({
				name: dataset.url.hostname
			}, {
				$push: {
					datasets: dataset._id
				}
			}, {
				upsert: true,
				setDefaultsOnInsert: true
			})
			console.log(res)
		}

	} catch (error) {
		console.log(error.message)
	}
}