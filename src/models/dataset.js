let mongoose = require('mongoose')

const {
	CRAWL_InitRange,
	CRAWL_EndRange
} = require('../config');

let datasetSchema = new mongoose.Schema({
	url: {
		type: mongoose.SchemaTypes.Mixed,
		required: true,
		unique: true
	},
	lastModified: {
		type: Date,
		default: new Date()
	},
	crawlInterval: {
		type: Number,
		default: getRandomInt(CRAWL_InitRange, CRAWL_EndRange)
	},
	nextCrawl: {
		type: Date,
		default: new Date()
	},
	errorCount: {
		type: Number,
		default: 0
	},
	nextVersionCount: {
		type: Number,
		default: 0
	},
	stopped: {
		type: Boolean,
		default: false
	},
	filename: String,
	versions: Array,
	meta: {}

})

datasetSchema.statics.getDatasets = function () {
	return new Promise((resolve, reject) => {
		this.find((err, datasets) => {
			if (err) {
				console.error(err)
				return reject(err)
			}

			resolve(datasets)
		})
	})
}

datasetSchema.statics.getDataset = function (url) {
	console.log(url)
	return new Promise((resolve, reject) => {
		this.findOne({
			'url.href': url
		}, (err, dataset) => {
			if (err) {
				console.error(err)
				return reject(err)
			}

			resolve(dataset)
		})
	})
}

datasetSchema.statics.getDatasetsToBeCrawled = function () {
	return new Promise((resolve, reject) => {
		this.find({
			'stopped': false,
			'nextCrawl': {
				$lt: new Date()
			}
		}, (err, datasets) => {
			if (err) {
				console.error(err)
				return reject(err)
			}

			resolve(datasets)
		})
	})
}
module.exports = mongoose.model('datasets', datasetSchema)


function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min) + min);
}