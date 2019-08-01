let mongoose = require('mongoose')

let hostSchema = new mongoose.Schema({
	hostname: {
		type: String,
		required: true,
		unique: true
	},
	currentlyCrawled: Boolean,
	nextCrawl: {
		type: Date,
		default: new Date()
	}
})

hostSchema.statics.getHostByName = function (name) {
	return new Promise((resolve, reject) => {
		this.findOne({
			hostname: name
		}, (error, dataset) => {
			if (error) {
				console.error(error)
				return reject(error)
			}

			resolve(dataset)
		})
	})
}

module.exports = mongoose.model('hosts', hostSchema)