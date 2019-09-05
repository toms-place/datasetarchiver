//db setup
const db = require('../database').getInstance();
let Crawler = require('../utils/crawler');
const {
	CRAWL_InitRange
} = require('../config');
const getRandomInt = require('../utils/randomInt');

async function addHrefToDB(href, source_href = '', filename = '', filetype = '') {
	let url = new URL(href);
	let resp = {};
	let dataset = null;

	try {

		dataset = new db.dataset({
			url: url,
			id: url.href,
			'meta.filename': filename,
			'meta.filetype': filetype,
			'crawl_info.crawlInterval': getRandomInt(CRAWL_InitRange, CRAWL_InitRange * 4)
		})

		if (source_href.length > 0) {
			dataset.meta.source.push(new URL(source_href))
		}

		await dataset.save()

		resp = {
			datasetstatus: 200,
			datasetmessage: 'dataset added',
			dataseturl: url.href
		};

	} catch (error) {
		if (error.name == 'ValidationError' || error.code == 11000) {
			if (source_href.length > 0) {
				let dataset = await db.dataset.findOne({
					id: url.href
				})
				let src = new URL(source_href)
				if (!dataset.meta.source.some(e => e.host === src.host)) {
					dataset.meta.source.push(src)
					await dataset.save();
					resp = {
						datasetstatus: 200,
						datasetmessage: 'src added to dataset',
						dataseturl: url.href
					};
				} else {
					resp = {
						datasetstatus: 400,
						datasetmessage: 'src and url already added',
						dataseturl: url.href
					};
				}
			} else {
				resp = {
					datasetstatus: 400,
					datasetmessage: 'url already added',
					dataseturl: url.href
				};
			}
		} else {
			throw error;
		}
	}

	try {
		if (dataset != null) {
			await db.host.updateOne({
				name: url.hostname
			}, {
				$push: {
					datasets: dataset._id
				}
			}, {
				upsert: true,
				setDefaultsOnInsert: true
			})

			resp.hoststatus = 200;
			resp.hostmessage = 'host added';
			resp.hosturl = url.hostname;
		} else {
			resp.hoststatus = 404;
			resp.hostmessage = 'host not added, no dataset created';
			resp.hosturl = url.hostname;

		}

	} catch (error) {
		resp.hoststatus = 404;
		resp.hostmessage = 'host not added';
		resp.hosturl = url.hostname;
	}

	return resp

}

async function crawlHref(href) {
	try {

		let url = new URL(href);

		if (url) {
			let crawler = new Crawler(url);
			crawler.crawl()
			return true;
		} else {
			return false;
		}
	} catch (error) {
		throw error
	}
}

async function deleteFromDB(href) {
	try {

		let url = new URL(href);

		let status = await db.dataset.deleteOne({
			id: url.href
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

async function getAllVersionsOfDatasetAsStream(href) {
	try {
		let url = new URL(href);
		let dataset = await db.dataset.findOne({
			url: url
		})
		let versions = []
		for (let version of dataset.versions) {
			let downloadStream = db.bucket.openDownloadStream(version)
			versions.push(downloadStream)
		}
		return versions
	} catch (error) {
		throw error
	}

}

async function addManyHrefsToDB(hrefs) {

	let datasets = [];
	let url;
	let dataset;

	for (let i = 0; i < hrefs.length; i++) {

		try {

			url = new URL(hrefs[i].url)

			dataset = await new db.dataset({
				url: url,
				id: url.href,
				'meta.filetype': '',
				'meta.filename': '',
				'meta.source': [],
				'crawl_info.crawlInterval': getRandomInt(CRAWL_InitRange, CRAWL_InitRange * 4)
			});

			if (hrefs[i].format) {
				dataset.meta.filetype = hrefs[i].format
			}

			if (hrefs[i].dataset) {
				dataset.meta.source.push(new URL(hrefs[i].dataset))
			}

			datasets.push(dataset)

		} catch (error) {
			console.error('mongoose db class', error.message)
		}

	}

	console.log('inserting:', datasets.length)

	try {
		let res = await db.dataset.insertMany(datasets, {
			ordered: false,
			rawResult: true
		});

		if (res.insertedCount != undefined) {
			console.log('Inserted', res.insertedCount)
		} else {
			console.log('Inserted', res)
		}

	} catch (error) {
		if (error.code == 11000) {
			console.log('Inserted', error.result.result.nInserted)
		} else {
			console.error('await error', error.code)
		}
	}
	/*
		try {

			let ids;

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
	*/

}


module.exports = {
	addHrefToDB,
	deleteFromDB,
	crawlHref,
	getDatasets,
	crawlDataset,
	getAllVersionsOfDatasetAsStream,
	addManyHrefsToDB
}