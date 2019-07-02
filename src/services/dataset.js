//db setup
let db = require('../database');
import Crawler from '../utils/crawler';
const rp = require('request-promise-native');

async function addUrlToDB(href) {
	try {
		let url = new URL(href);
		let filename = url.pathname.split('/')[url.pathname.split('/').length - 1]
		let versions = [];

		//TODO check header to acquire needed informaiton
		let header = await rp.head(url.href)

		if (header['content-type'].includes('text/html')) {
			throw new Error('This is a Website!!');
		} else {

			let dataset = await new db.dataset({
				url: url,
				versions: versions,
				filename: filename
			}).save()
			let resp = `Worker ${process.pid} added ${dataset.url} to DB`;
			return resp
		}

	} catch (error) {
		if (error.code == 11000) {
			throw new Error(`${url.href} already in DB`)
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
		console.log(datasets)
		if (datasets) {
			return datasets;
		} else {
			throw new Error(`no datasets`);
		}
	} catch (error) {
		throw error
	}

}

module.exports = {
	addUrlToDB,
	deleteFromDB,
	crawlUrl,
	getDatasets
}