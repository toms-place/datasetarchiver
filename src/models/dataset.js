let mongoose = require('mongoose')
let root = process.env.DATASETPATH || './data';

let storageSchema = new mongoose.Schema({
	root: {
		type: String,
		default: root
	},
	path: String,
	filename: String,
	host: String
});

let versionsSchema = new mongoose.Schema({
	storage: storageSchema,
	hash: String
});

let datasetSchema = new mongoose.Schema({
	url: {
		type: String,
		required: true,
		unique: true
	},
	lastModified: {
		type: Date,
		default: new Date()
	},
	crawlInterval: {
		type: Number,
		default: 10 //getRandomInt(200000, 300000)
	},
	nextCrawl: {
		type: Date,
		default: new Date()
	},
	errorCount: {
		type: Number,
		default: 0
	},
	nextVersionCount: {
		type: Number,
		default: 0
	},
	stopped: {
		type: Boolean,
		default: false
	},
	storage: {
		type: storageSchema
	},
	versions: {
		type: [versionsSchema]
	},
	meta: {}

})

datasetSchema.virtual('publicPath').get(function () {
	return this.host + "/" + this.filename
})

datasetSchema.statics.getDatasets = function () {
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

module.exports = mongoose.model('datasets', datasetSchema)


function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min) + min);
}