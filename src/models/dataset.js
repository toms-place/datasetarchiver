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

let crawlingInfoSchema = new mongoose.Schema({
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
	stopped: {
		type: Boolean,
		default: false
	},
	host: {
		type: mongoose.Schema.Types.String,
		ref: 'hosts'
	},
})

let datasetSchema = new mongoose.Schema({
	url: {
		type: mongoose.Schema.Types.Mixed,
		required: true,
		unique: true
	},
	crawlingInfo: crawlingInfoSchema,
	versions: [{
		type: mongoose.Schema.Types.ObjectId
	}],
	meta: metaSchema
})

datasetSchema.plugin(uniqueValidator);

module.exports = mongoose.model('datasets', datasetSchema)