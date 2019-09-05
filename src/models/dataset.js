let mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

const {
	CRAWL_minRange
} = require('../config');

let metaSchema = new mongoose.Schema({
	source: {
		type: Array,
		default: []
	},
	filetype: String,
	versionCount: {
		type: Number,
		default: 0
	},
	filename: String
})

let crawl_infoSchema = new mongoose.Schema({
	firstCrawl: {
		type: Boolean,
		default: true
	},
	crawlInterval: {
		type: Number,
		default: CRAWL_minRange
	},
	nextCrawl: {
		type: Date,
		default: new Date()
	},
	lastCrawlAttempt: {
		type: Date,
		default: new Date()
	},
	changeDistribution: {
		type: Array,
		default: []
	},
	errorCount: {
		type: Number,
		default: 0
	},
	errorStore: {
		type: Array,
		default: []
	},
	stopped: {
		type: Boolean,
		default: false
	}
})

let datasetSchema = new mongoose.Schema({
	id: {
		type: String,
		unique: true,
		required: true
	},
	url: {
		type: mongoose.Schema.Types.Mixed,
		required: true
	},
	crawl_info: crawl_infoSchema,
	versions: [{
		type: mongoose.Schema.Types.ObjectId
	}],
	meta: metaSchema
})

datasetSchema.plugin(uniqueValidator);


datasetSchema.query.getDatasetToCrawl = async function (url) {
	return this.findOne({
		$and: [{
			id: url.href
		}, {
			'crawl_info.nextCrawl': {
				$lt: new Date()
			}
		}]
	})
}


datasetSchema.query.getDatasetsToCrawl = async function () {

	return this.find({
		$and: [{
			'crawl_info.nextCrawl': {
				$lt: new Date()
			}
		}, {
			'crawl_info.stopped': false
		}]
	})

}


module.exports = mongoose.model('datasets', datasetSchema)