import mongoose, {
	Document,
	DocumentQuery,
	Model
} from 'mongoose';
import config from '../../config';
import db from '../../common/database';
import uniqueValidator from 'mongoose-unique-validator'

export interface IDataset extends Document {
	id: string,
	url: URL,
	crawl_info: any,
	versions: number[],
	meta: any
}

export interface IDatasetModel extends Model < IDataset, typeof datasetQueryHelpers > {
	addMany(datasets: IDataset[]);
}

let datasetSchema = new mongoose.Schema({
	id: {
		type: String,
		unique: true,
		required: true
	},
	url: {
		type: mongoose.Schema.Types.Mixed,
		required: true
	},
	crawl_info: {
		firstCrawl: {
			type: Boolean,
			default: true
		},
		crawlInterval: {
			type: Number,
			default: config.CRAWL_minRange
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
		errorStore: {
			type: Array,
			default: []
		},
		stopped: {
			type: Boolean,
			default: false
		}
	},
	versions: [{
		type: mongoose.Schema.Types.ObjectId
	}],
	meta: {
		source: {
			type: Array,
			default: []
		},
		versionCount: {
			type: Number,
			default: 0
		},
		filename: String,
		filetype: String,
		extension: String
	}
})

datasetSchema.static('addMany', async (datasets: IDataset[]): Promise < any > => {

	return new Promise < any > ((resolve, reject) => {
		db.dataset.insertMany(datasets, {
			ordered: false
		}, async (error, docs) => {
			if (error) {
				let datasets = await db.dataset.find({
					_id: {
						$in: error.result.result.insertedIds
					}
				}, '_id url.hostname')

				for (let dataset of datasets) {
					await db.host.updateOne({
						name: dataset.url.hostname
					}, {
						$push: {
							datasets: dataset._id
						}
					}, {
						upsert: true,
						setDefaultsOnInsert: true
					})
				}

				resolve(datasets.length)

			} else {
				for (let doc of docs) {
					await db.host.updateOne({
						name: doc.url.hostname
					}, {
						$push: {
							datasets: doc._id
						}
					}, {
						upsert: true,
						setDefaultsOnInsert: true
					})
				}
				resolve(docs.length)
			}
		});
	})
});

let datasetQueryHelpers = {
	oneToBeCrawled(this: DocumentQuery < any, IDataset > , url: URL) {

		if (config.env == 'development') {
			return this.findOne({
				$and: [{
					id: url.href
				}, {
					'crawl_info.stopped': false
				}]
			})
		}

		return this.findOne({
			$and: [{
				id: url.href
			}, {
				'crawl_info.nextCrawl': {
					$lt: new Date()
				}
			}, {
				'crawl_info.stopped': false
			}]
		})
	},
	allToBeCrawled(this: DocumentQuery < any, IDataset > ) {
		return this.find({
			$and: [{
				'crawl_info.nextCrawl': {
					$lt: new Date()
				}
			}, {
				'crawl_info.stopped': false
			}]
		})
	}
};

datasetSchema.query = datasetQueryHelpers
datasetSchema.plugin(uniqueValidator);

export default mongoose.model < IDataset, IDatasetModel > ('datasets', datasetSchema)