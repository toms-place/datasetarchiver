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
	currentlycrawling: {
		type: Boolean,
		default: false
	},
	filename: String,
	versions: Array,
	meta: {
		source: String,
		versioncount: Number
	}

})

datasetSchema.statics.getDatasets = function () {
	return new Promise((resolve, reject) => {
		this.find((error, datasets) => {
			if (error) {
				console.error(error)
				return reject(error)
			}

			resolve(datasets)
		})
	})
}

datasetSchema.statics.getDataset = function (url) {
	return new Promise((resolve, reject) => {
		this.findOne({
			url: url
		}, (error, dataset) => {
			if (error) {
				console.error(error)
				return reject(error)
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
		}, (error, datasets) => {
			if (error) {
				console.error(error)
				return reject(error)
			}

			resolve(datasets)
		})
	})
}
module.exports = mongoose.model('datasets', datasetSchema)


function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min) + min);
}