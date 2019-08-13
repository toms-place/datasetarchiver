//db setup
const db = require('../database').getInstance();
let Crawler = require('../utils/crawler');

async function addHrefToDB(href, source_href = '', filename = '') {
	let url = new URL(href);

	try {

		//TODO check header to acquire needed informaiton
		/*
		let header = await rp.head(url.href)

		if (header['content-type'].includes('text/html')) {
			throw new Error('text/html:', url.href);
		} else {*/

		let dataset = await new db.dataset({
			url: url,
			'meta.filename': filename,
			'crawlingInfo.host.name': url.hostname
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
			let dataset = await db.dataset.find({
				url: url
			})
			if (source_href.length > 0) {
				let src = new URL(source_href)
				if (!dataset.meta.source.some(e => e.host === src.host)) {
					dataset.meta.source.push(src)
					await dataset.save();
					let resp = `Worker ${process.pid} added ${src.host} to Meta`;
					return resp;
				} else {
					return new Error(`${url.href} already in DB and source already added`)
				}
			} else {
				return new Error(`${url.href} already in DB`)
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
			return new Error(`A Problem occured, maybe ${url.href} is not in our DB. If you want to add it, try /api/add?url=`);
		}
	} catch (error) {
		throw error
	}
}

async function crawlHref(href) {
	try {


		let url = new URL(href);
		let dataset = await db.dataset.findOne({
			url: url
		})

		if (dataset) {
			new Crawler(dataset);
			let resp = `Worker ${process.pid} started to crawl: ${url.href}`;
			return resp;
		} else {
			return new Error(`${url.href} is not in our DB. If you want to add it, try /api/add?url=`);
		}
	} catch (error) {
		throw error
	}
}

async function crawlDataset(dataset) {
	try {
		new Crawler(dataset);
		let resp = `Worker ${process.pid} started to crawl: ${url.href}`;
		return resp;
	} catch (error) {
		throw error
	}
}

async function getDatasets() {
	try {

		let datasets = await db.dataset.find({})
		if (datasets) {
			return datasets;
		} else {
			return new Error(`no datasets`);
		}
	} catch (error) {
		throw error
	}

}

async function getDatasetsToBeCrawled() {

	let datasets = await db.dataset.find({
		$and: [{
				'crawlingInfo.stopped': false
			},
			{
				'crawlingInfo.nextCrawl': {
					$lt: new Date()
				}
			}, {
				"crawlingInfo.host.nextCrawl": {
					$lt: new Date()
				}
			}
		]
	})

	return datasets
}


module.exports = {
	addHrefToDB,
	deleteFromDB,
	crawlHref,
	getDatasets,
	getDatasetsToBeCrawled,
	crawlDataset
}