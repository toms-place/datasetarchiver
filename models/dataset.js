let mongoose = require('mongoose')

let datasetSchema = new mongoose.Schema({
	uri: {
		type: String,
		required: true,
		unique: true
	},
	lastModified: {
		type: Date,
		default: new Date()
	},
	waitingTime: {
		type: Number,
		default: 10000
	},
	errorCount: {
		type: Number,
		default: 0
	},
	versionCount: {
		type: Number,
		default: 0
	},
	stopped: {
		type: Boolean,
		default: false
	},
	path: {
		type: String
	},
	host: {
		type: String
	},
	filename: {
		type: String
	},
	versionPaths: {
		type: Array
	},
	meta: {}

})

datasetSchema.statics.getDatasets = function () {
	return new Promise((resolve, reject) => {
		this.find((err, docs) => {
			if (err) {
				console.error(err)
				return reject(err)
			}

			resolve(docs)
		})
	})
}

module.exports = mongoose.model('datasets', datasetSchema)