let mongoose = require('mongoose')
let fileSchema = new mongoose.Schema({
	length: Number,
	chunkSize: Number,
	uploadDate: Date,
	filename: String,
	md5: String,
	metadata: mongoose.SchemaTypes.Mixed,
})

fileSchema.statics.getFiles = function () {
	return new Promise((resolve, reject) => {
		this.find((err, datasets) => {
			if (err) {
				console.error(err)
				return reject(err)
			}

			resolve(datasets)
		})
	})
}

fileSchema.statics.getFilesById = function (id) {
	return new Promise((resolve, reject) => {
		this.find({
			'id': id
		}, (err, datasets) => {
			if (err) {
				console.error(err)
				return reject(err)
			}

			resolve(datasets)
		})
	})
}

fileSchema.statics.getFileById = function (id) {
	return new Promise((resolve, reject) => {
		this.find({
			'_id': id
		}, (err, datasets) => {
			if (err) {
				console.error(err)
				return reject(err)
			}

			resolve(datasets)
		})
	})
}

module.exports = mongoose.model('fs.files', fileSchema)


function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min) + min);
}