let mongoose = require('mongoose')
var uniqueValidator = require('mongoose-unique-validator');

let hostSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true
	},
	currentlyCrawled: {
		type: Boolean,
		default: false
	},
	nextCrawl: {
		type: Date,
		default: new Date()
	},
	datasets: [{
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'datasets'
	}]
})

hostSchema.plugin(uniqueValidator);

hostSchema.query.getDatasetsToCrawl = async function () {

	//TODO optimize lookup
	let hosts = await this.find({
		$and: [{
			currentlyCrawled: false
		}, {
			nextCrawl: {
				$lt: new Date()
			}
		}]
	}).populate({
		path: 'datasets',
		match: {
			'crawlingInfo.nextCrawl': {
				$lt: new Date()
			},
			'crawlingInfo.stopped': false

		}
	}).exec()

	if (hosts) {
		let datasets = []
		for (let host of hosts) {
			for (let dataset of host.datasets) {
				datasets.push(dataset)
				break;
			}
		}
		return datasets
	} else {
		return null
	}
}



hostSchema.query.getDatasetToCrawl = async function (url) {
	let host = await this.findOne({
		$and: [{
			name: url.hostname
		}, {
			currentlyCrawled: false
		}, {
			nextCrawl: {
				$lt: new Date()
			}
		}]
	}).populate({
		path: 'datasets',
		match: {
			url: url,
			'crawlingInfo.stopped': false
		}
	}).exec()

	if (host) {
		return host.datasets[0]
	} else {
		return null
	}
}

module.exports = mongoose.model('hosts', hostSchema)