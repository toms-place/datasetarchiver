let mongoose = require('mongoose')

let datasetSchema = new mongoose.Schema({
	uri: {
		type: String,
		required: true,
		unique: true
	}
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