let mongoose = require('mongoose')

let fileSchema = new mongoose.Schema({
	length: Number,
	chunkSize: Number,
	uploadDate: Date,
	filename: String,
	md5: String,
	metadata: {
		version: Number
	},
})

fileSchema.query.getFiles = function () {
		return this.find({})
}

fileSchema.query.getFileById = function (id) {
	return this.where({
		'_id': id
	});
}

fileSchema.query.getFileByVersion = async function (name, version) {
	return this.where({
		filename: name
	}).where({
		'metadata.version': version
	});
}

fileSchema.query.getFilesByNameAndVersions = async function (name, version1, version2) {
	return this.where({
		filename: name
	}).or([{
		'metadata.version': version1
	}, {
		'metadata.version': version2
	}]);
}

module.exports = mongoose.model('datasets.files', fileSchema)