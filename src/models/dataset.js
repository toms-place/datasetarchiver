let mongoose = require('mongoose');
const {
	CRAWL_InitRange,
	CRAWL_EndRange
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

let hostSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	currentlyCrawled: {
		type: Boolean,
		default: false
	},
	nextCrawl: {
		type: Date,
		default: new Date()
	}
})

let crawlingInfoSchema = new mongoose.Schema({
	firstCrawl: {
		type: Boolean,
		default: true
	},
	crawlInterval: {
		type: Number,
		default: getRandomInt(CRAWL_InitRange, CRAWL_EndRange)
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
	host: hostSchema,
})

let datasetSchema = new mongoose.Schema({
	url: {
		type: mongoose.Schema.Types.Mixed,
		required: true,
		unique: true
	},
	crawlingInfo: crawlingInfoSchema,
	versions: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'files'
	}],
	meta: metaSchema
})

module.exports = mongoose.model('datasets', datasetSchema)

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min) + min);
}