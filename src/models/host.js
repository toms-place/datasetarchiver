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
	}]
})

hostSchema.plugin(uniqueValidator);

hostSchema.query.getHostsToCrawl = function () {
	return this.find({
		$and: [{
			currentlyCrawled: false
		}, {
			nextCrawl: {
				$lt: new Date()
			}
		}]
	})
}

hostSchema.query.getHostToCrawl = function (hostname) {
	return this.findOne({
		$and: [{
			name: hostname
		}, {
			currentlyCrawled: false
		}, {
			nextCrawl: {
				$lt: new Date()
			}
		}]
	})
}

module.exports = mongoose.model('hosts', hostSchema)