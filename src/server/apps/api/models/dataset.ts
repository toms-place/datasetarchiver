import mongoose, {
	Document,
	DocumentQuery,
	Model
} from 'mongoose';
import config from '../../../config';
import db from '../../../common/database';
import uniqueValidator from 'mongoose-unique-validator'
import {
	ObjectId
} from 'mongodb'
import compareSourceOfDatasets from '../../../utils/compareSourceOfDatasets';


export interface IDataset extends Document {
	id: string,
	url: URL,
	crawl_info: any,
	versions: ObjectId[],
	meta: any
}

export interface IDatasetModel extends Model < IDataset, typeof datasetQueryHelpers > {
	addMany: (datasets: IDataset[]) => Promise < number > ,
	getDatasetIDsAndHostNamesToBeCrawledOneByHost: () => Promise < IDataset[] > ,
	releaseDatasets: () => any,
	releaseDataset: (_id: ObjectId) => Promise < IDataset > ,
	lockDataset: (_id: ObjectId) => Promise < IDataset >
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
		currentlyCrawled: {
			type: Boolean,
			default: false
		},
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
		source: [{
			type: mongoose.Schema.Types.Mixed
		}],
		versionCount: {
			type: Number,
			default: 0
		},
		filename: {
			type: String,
			default: ''
		},
		filetype: {
			type: String,
			default: '',
			index: true
		},
		extension: {
			type: String,
			default: '',
			index: true
		},
		insertDate: {
			type: Date,
			default: new Date()
		},
		meanDownloadTime: {
			type: Number,
			default: 0
		},
		meanSavingTime: {
			type: Number,
			default: 0
		}
	}
})


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
		} else {
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
		}

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

datasetSchema.statics.releaseDatasets = function () {
	return this.updateMany({
		'crawl_info.stopped': false
	}, {
		$set: {
			'crawl_info.currentlyCrawled': false
		}
	});
}

datasetSchema.statics.releaseDataset = function (_id: ObjectId) {
	return this.findByIdAndUpdate(_id, {
		$set: {
			'crawl_info.currentlyCrawled': false
		}
	}, {
		new: true
	})
}

datasetSchema.statics.lockDataset = function (_id: ObjectId) {
	return this.findOneAndUpdate({
		$and: [{
			_id: _id
		}, {
			'crawl_info.nextCrawl': {
				$lt: new Date()
			}
		}, {
			'crawl_info.currentlyCrawled': false
		}]
	}, {
		$set: {
			'crawl_info.currentlyCrawled': true
		}
	}, {
		new: true
	})
}

datasetSchema.statics.addMany = async function (datasets: IDataset[]): Promise < number > {
	try {
		let docs = await db.dataset.insertMany(datasets, {
			ordered: false
		})

		if (docs.length == 0) {

			let ids: Array < String > = datasets.map(dataset => {
				return dataset.id
			});

			let oldDatasets = await db.dataset.find({
				id: {
					$in: ids
				}
			})
			let changeCount = 0;

			if (oldDatasets) {
				let update = await compareSourceOfDatasets(oldDatasets, datasets)
				for (let key in update) {
					let res = await db.dataset.updateOne({
						_id: key
					}, {
						$set: {
							'meta.source': update[key]
						}
					})
					if (res.nModified = 1) {
						++changeCount;
					}
				}
			}

			return changeCount

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
			return docs.length
		}


	} catch (error) {
		if (error.code == 11000) {
			let changeCount = 0;

			let _ids: Array < String > = error.result.result.insertedIds.map(dataset => {
				return dataset._id;;
			});

			if (_ids.length > 0) {

				let insertedDatasets = await db.dataset.find({
					_id: {
						$in: _ids
					}
				}, '_id url.hostname')

				for (let dataset of insertedDatasets) {
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
			}

			if (error.result.result.writeErrors.length > 0) {
				let ids = error.result.result.writeErrors.map((writeError) => {
					return writeError.err.op.id
				})
				let newDatasets = error.result.result.writeErrors.map((writeError) => {
					return new db.dataset(writeError.err.op)
				})

				let oldDatasets = await db.dataset.find({
					id: {
						$in: ids
					}
				})

				if (oldDatasets) {
					let update = await compareSourceOfDatasets(oldDatasets, newDatasets)
					for (let key in update) {
						let res = await db.dataset.updateOne({
							_id: key
						}, {
							$set: {
								'meta.source': update[key]
							}
						})
						if (res.nModified = 1) {
							++changeCount;
						}
					}
				}

			}

			return _ids.length + changeCount

		} else if (error.code == 17280){
			console.log(error)
			return error.result.result.nInserted
		} else {
			throw error
		}
	}
};

datasetSchema.statics.getDatasetIDsAndHostNamesToBeCrawledOneByHost = function (): Promise < IDataset[] > {
	return this.aggregate(
		[{
			$match: {
				$and: [{
					'crawl_info.nextCrawl': {
						$lt: new Date()
					}
				}, {
					'crawl_info.currentlyCrawled': false
				}, {
					'crawl_info.stopped': false
				}]
			}
		}, {
			$sort: {
				"crawl_info.nextCrawl": 1
			}
		}, {
			$group: {
				_id: '$url.hostname',
				id: {
					'$first': '$_id'
				}
			}
		}]).allowDiskUse(true);
};

export default mongoose.model < IDataset, IDatasetModel > ('datasets', datasetSchema)