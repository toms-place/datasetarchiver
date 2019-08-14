//db setup
const db = require('../database').getInstance();
let Crawler = require('../utils/crawler');
const {
	CRAWL_InitRange,
	CRAWL_EndRange
} = require('../config');
const getRandomInt = require('../utils/randomInt');

async function addHrefToDB(href, source_href = '', filename = '', filetype = '') {
	let url = new URL(href);

	try {

		let dataset = await new db.dataset({
			url: url,
			'meta.filename': filename,
			'meta.filetype': filetype,
			'crawlingInfo.crawlInterval': getRandomInt(CRAWL_InitRange, CRAWL_EndRange),
			'crawlingInfo.host': url.hostname
		})

		if (source_href.length > 0) {
			dataset.meta.source.push(new URL(source_href))
		}

		await dataset.save()


		await db.host.updateOne({
			name: url.hostname
		}, {
			$push: {
				datasets: dataset._id
			}
		}, {
			upsert: true,
			setDefaultsOnInsert: true
		}).exec();

		let resp = `Worker ${process.pid} added ${dataset.url} to DB`;
		return resp

	} catch (error) {
		if (error.name == 'ValidationError') {
			if (source_href.length > 0) {
				let dataset = await db.dataset.find({
					url: url
				})
				let src = new URL(source_href)
				if (!dataset.meta.source.some(e => e.host === src.host)) {
					dataset.meta.source.push(src)
					await dataset.save();
					let resp = `Worker ${process.pid} added ${src.host} to Meta`;
					return resp;
				} else {
					throw new Error(`${url.href} already in DB and source already added`)
				}
			} else {
				throw new Error(`${url.href} already in DB`)
			}
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
			return new Error(`A Problem occured, maybe ${url.href} is not in our DB. If you want to add it, try /api/add?url=`);
		}
	} catch (error) {
		throw error
	}
}

async function crawlHref(href) {
	try {

		let url = new URL(href);
		let dataset = await db.host.find().getDatasetToCrawl(url, url.hostname)

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


module.exports = {
	addHrefToDB,
	deleteFromDB,
	crawlHref,
	getDatasets,
	crawlDataset
}