//db setup
let db = require('../database');
let Crawler = require('../utils/crawler');
const rp = require('request-promise-native');

async function addUrlToDB(href, source_href = '') {
	let url = new URL(href);

	try {
		let filename = url.pathname.split('/')[url.pathname.split('/').length - 1]

		//TODO check header to acquire needed informaiton
		/*
		let header = await rp.head(url.href)

		if (header['content-type'].includes('text/html')) {
			throw new Error('text/html:', url.href);
		} else {*/

		let dataset = await new db.dataset({
			url: url,
			filename: filename
		})

		if (source_href.length > 0) {
			dataset.meta.source.push(new URL(source_href))
		}

		await dataset.save()

		let resp = `Worker ${process.pid} added ${dataset.url} to DB`;
		return resp
		//}

	} catch (error) {
		if (error.code == 11000) {
			let dataset = await db.dataset.getDataset(url)
			if (source_href.length > 0) {
				let src = new URL(source_href)
				if (!dataset.meta.source.some(e => e.host === src.host)) {
					dataset.meta.source.push(src)
					await dataset.save();
					let resp = `Worker ${process.pid} added ${src.href} to Meta`;
					return resp;
				} else {
					return `${url.href} already in DB and source already added`
				}
			} else {
				return `${url.href} already in DB`
			}
		} else {
			return error.message;
		}
	}
}

async function deleteFromDB(href) {
	try {

		let url = new URL(href);

		let status = await db.dataset.deleteOne({
			url: url
		});

		if (status.deletedCount == 1) {
			return `Worker ${process.pid} deleted: ${url.href}`;
		} else {
			throw new Error(`A Problem occured, maybe ${url.href} is not in our DB. If you want to add it, try /api/add?url=`);
		}
	} catch (error) {
		throw error
	}
}

async function crawlUrl(href) {
	try {

		let url = new URL(href);
		let dataset = await db.dataset.getDataset(url)

		if (dataset) {
			new Crawler(dataset);
			let resp = `Worker ${process.pid} started to crawl: ${url.href}`;
			return resp;
		} else {
			throw new Error(`${url.href} is not in our DB. If you want to add it, try /api/add?url=`);
		}
	} catch (error) {
		throw error
	}

}

async function getDatasets() {
	try {

		let datasets = await db.dataset.getDatasets()
		if (datasets) {
			return datasets;
		} else {
			throw new Error(`no datasets`);
		}
	} catch (error) {
		throw error
	}

}


async function getDatasetsToBeCrawled() {

	let datasets = await db.dataset.aggregate([
		[{
				"$match": {
					"$and": [{
							'stopped': false
						},
						{
							'nextCrawl': {
								$lt: new Date()
							}
						}
					]
				},
			}, {
				"$lookup": {
					"from": "hosts",
					"localField": "url.hostname",
					"foreignField": "hostname",
					"as": "host"
				}
			},
			{
				"$unwind": "$host"
			},
			{
				"$match": {
					"host.nextCrawl": {
						"$lt": new Date()
					}
				}
			}
		]
	])

	return datasets
}


module.exports = {
	addUrlToDB,
	deleteFromDB,
	crawlUrl,
	getDatasets,
	getDatasetsToBeCrawled
}