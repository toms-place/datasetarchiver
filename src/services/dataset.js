//db setup
let db = require('../database');
let Crawler = require('../utils/crawler');
const rp = require('request-promise-native');

async function addUrlToDB(href, source_href = '') {
	let url = new URL(href);

	try {
		let filename = url.pathname.split('/')[url.pathname.split('/').length - 1]

		//TODO check header to acquire needed informaiton
		let header = await rp.head(url.href)

		if (header['content-type'].includes('text/html')) {
			let err = new Error('text/html');
			err.status = 100;
			throw err
		} else {

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
		}

	} catch (error) {
		if (error.code == 11000) {
			let dataset = await db.dataset.getDataset(url)
			if (source_href.length > 0) {
				let src = new URL(source_href)
				if (!dataset.meta.source.some(e => e.host === src.host)) {
					dataset.meta.source.push(src)
					await dataset.save();
					let resp = `Worker ${process.pid} added ${src.href} to Meta`;
					console.log(resp)
					return resp;
				} else {
					return `${url.href} already in DB and source already added`
				}
			} else {
				return `${url.href} already in DB`
			}
		} else if (error.status == 100) {
			return 'this is a website'
		} else {
			throw error;
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

	let datasetsToBeCrawled = [];

	let datasets = await db.dataset.find({
		'stopped': false,
		'nextCrawl': {
			$lt: new Date()
		}
	})

	for (let dataset of datasets) {

		let host = await db.host.getHostByName(dataset.url.hostname)
		if (host == null) host = await new db.host({
			hostname: dataset.url.hostname
		})
		if (host.currentlyCrawled == false && host.nextCrawl < new Date()) {
			datasetsToBeCrawled.push(dataset)
		}
	}

	return datasetsToBeCrawled
}


module.exports = {
	addUrlToDB,
	deleteFromDB,
	crawlUrl,
	getDatasets,
	getDatasetsToBeCrawled
}