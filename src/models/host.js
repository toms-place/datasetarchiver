let mongoose = require('mongoose')

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

hostSchema.query.getHostsToCrawl = function () {
	return this.find({
		nextCrawl: {
			$lt: new Date()
		}
	})
}

hostSchema.query.getHostToCrawl = function (hostname) {
	return this.findOne({
		$and: [{
			name: hostname
		}, {
			nextCrawl: {
				$lt: new Date()
			}
		}]
	})
}

module.exports = mongoose.model('hosts', hostSchema)