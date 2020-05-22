import mongoose, {
	Document,
	DocumentQuery,
	Model,
} from 'mongoose'
import L from '../utils/logger'
import cf from '../config'
import db from '../utils/database'
import uniqueValidator from 'mongoose-unique-validator'
import {
	ObjectId
} from 'mongodb'
import compareSourceOfDatasets from '../utils/compareSourceOfDatasets'
import {
	IHost
} from './host'
import { ISource } from './source'

export interface ICrawlInfo {
	currentlyCrawled: boolean;
	firstCrawl: boolean;
	crawlInterval: number;
	nextCrawl: Date;
	lastCrawlAttempt: Date;
	changeDistribution: [{
		newFile: boolean;
		interval: number;
	}];
	errorCount: number;
	errorStore: any[];
	stopped: boolean;
}

export interface IMeta {
	title: string;
	references: any;
	source: ISource[];
	versionCount: number;
	filename: string;
	filetype: string;
	extension: string;
	insertDate: Date;
	meanDownloadTime: number;
	meanResponseTime:  number;
}

export interface IDataset extends Document {
	_id: ObjectId;
	id: string;
	url: URL;
	crawl_info: ICrawlInfo;
	versions: string[];
	meta: IMeta;
}

const datasetSchema = new mongoose.Schema({
	id: {
		type: String,
		unique: true,
		required: true,
		index: true
	},
	url: {
		type: mongoose.Schema.Types.Mixed,
		unique: true,
		required: true,
		index: true
	},
	crawl_info: {
		currentlyCrawled: {
			type: Boolean,
			default: false,
			index: true
		},
		firstCrawl: {
			type: Boolean,
			default: true
		},
		crawlInterval: {
			type: Number,
			default: cf.CRAWL_minRange
		},
		nextCrawl: {
			type: Date,
			default: new Date(),
			index: true
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
			default: false,
			index: true
		}
	},
	versions: [{
		type: String,
		index: true,
		ref: 'datasets.files'
	}],
	meta: {
		title: {
			type: String,
			default: ''
		},
		references: {
			type: mongoose.Schema.Types.Mixed,
			index: true,
			default: undefined,
		},
		source: [{
			type: mongoose.Schema.Types.ObjectId,
			index: true,
			default: undefined,
			ref: 'sources',
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
		meanResponseTime: {
			type: Number,
			default: 0
		},
		tags: []
	}
})

if (cf.PRODUCTION) datasetSchema.set('shardKey', {id:1})


const datasetQueryHelpers = {
	oneToBeCrawled(this: DocumentQuery < any, IDataset > , url: URL) {

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
}

datasetSchema.query = datasetQueryHelpers
datasetSchema.plugin(uniqueValidator)

datasetSchema.statics.releaseDatasets = function () {
	return this.updateMany({
		$and: [{
			'crawl_info.currentlyCrawled': true
		},

		{
			'crawl_info.stopped': false
		}
		]
	}, {
		$set: {
			'crawl_info.currentlyCrawled': false
		}
	})
}

datasetSchema.statics.releaseDataset = function (id: URL['href']) {
	return this.findOneAndUpdate({id:id}, {
		$set: {
			'crawl_info.currentlyCrawled': false
		}
	}, {
		new: true
	}).select({
		'_id': 1
	})
}

datasetSchema.statics.lockDataset = function (id: URL['href']) {
	return this.findOneAndUpdate({
		$and: [{
			id: id
		}, {
			'crawl_info.currentlyCrawled': false
		}]
	}, {
		$set: {
			'crawl_info.currentlyCrawled': true
		}
	}, {
		new: true
	}).select({
		'meta.source': 0
	})
}

datasetSchema.statics.addMany = async function (datasets: IDataset[]): Promise < any > {
	const returnObject = {
		insertedDatasets: 0,
		insertedHosts: 0,
		updatedDatasets: 0
	}
	try {
		const docs = await db.dataset.insertMany(datasets, {
			ordered: false
		})

		if (docs.length == 0) {

			const ids: Array < string > = datasets.map(dataset => {
				return dataset.id
			})

			const newDatasets: Array < any > = datasets.map(dataset => {
				const res = {
					id: dataset.id,
					meta: {
						source: dataset.meta.source
					}
				}
				return res
			})

			const oldDatasets = await db.dataset.find({
				id: {
					$in: ids
				}
			}).select({
				_id: 1,
				id: 1,
				'meta.source': 1,
				'meta.references': 1
			})

			/*
			let date = new Date()
			try {
				console.log("REFS start:" + date.getUTCMinutes() + 'm' +  date.getSeconds() + 's' + date.getMilliseconds())
				let refAddedDS = datasets.map((ds_val) => {
					for (let val in oldDatasets) {
						if (ds_val.id == oldDatasets[val].id) {
							for (let key in oldDatasets[val].meta.references) {
								ds_val.meta.references[key].urls = new Set([...oldDatasets[val].meta.references[key].urls, ...ds_val.meta.references[key].urls])
								return ds_val
							}
						}
					}
				})
				date = new Date()
				console.log("REFS end:" + date.getUTCMinutes() + 'm' +  date.getSeconds() + 's' + date.getMilliseconds())
				
			} catch (error) {
				L.error(error)
			}
			*/


			if (oldDatasets) {
				const update = await compareSourceOfDatasets(oldDatasets, newDatasets)
				for (const key in update) {
					const res = await db.dataset.updateOne({
						_id: key
					}, {
						$set: {
							'meta.source': update[key]
						}
					})
					if (res.nModified == 1) {
						++returnObject.updatedDatasets
					}
				}
			}

			return returnObject

		} else {

			const hosts: IHost[] = []
			for (const doc of docs) {
				hosts.push(new db.host({
					name: doc.url.hostname
				}))
			}
			try {
				const hostRes = await db.host.insertMany(hosts, {
					ordered: false,
					//@ts-ignore
					forceServerObjectId: true
				})
				returnObject.insertedHosts = hostRes.length
			} catch (error) {
				if (error.code == 11000) {
					returnObject.insertedHosts = error.result.result.writeErrors.length - error.result.result.nInserted
				} else {
					console.log('insert many hosts', error)
				}
			}

			returnObject.insertedDatasets = docs.length
			return returnObject
		}


	} catch (error) {
		if (error.code == 11000) {

			const _ids: Array < ObjectId > = error.result.result.insertedIds.map((dataset: { _id: any }) => {
				return dataset._id
			})

			if (_ids.length > 0) {
				const insertedDatasets = await db.dataset.find({
					_id: {
						$in: _ids
					}
				}, 'url.hostname')
				const hosts: IHost[] = []
				for (const dataset of insertedDatasets) {
					hosts.push(new db.host({
						name: dataset.url.hostname
					}))
				}
				try {
					const hostRes = await db.host.insertMany(hosts, {
						ordered: false,
						//@ts-ignore
						forceServerObjectId: true
					})
					returnObject.insertedHosts = hostRes.length
				} catch (error) {
					if (error.code == 11000) {
						returnObject.insertedHosts = error.result.result.writeErrors.length - error.result.result.nInserted
					} else {
						console.log('insert many hosts', error)
					}
				}
				returnObject.insertedDatasets = insertedDatasets.length
			}

			if (error.result.result.writeErrors.length > 0) {
				const ids = error.result.result.writeErrors.map((writeError: { err: { op: { id: any } } }) => {
					return writeError.err.op.id
				})
				const newDatasets = error.result.result.writeErrors.map((writeError: { err: { op: { id: any; meta: { source: any } } } }) => {
					const res = {
						id: writeError.err.op.id,
						meta: {
							source: writeError.err.op.meta.source
						}
					}
					return res
				})

				const oldDatasets = await db.dataset.find({
					id: {
						$in: ids
					}
				}).select({
					_id: 1,
					id: 1,
					'meta.source': 1
				})

				if (oldDatasets) {
					const update = await compareSourceOfDatasets(oldDatasets, newDatasets)
					for (const key in update) {
						const res = await db.dataset.updateOne({
							_id: key
						}, {
							$set: {
								'meta.source': update[key]
							}
						})
						if (res.nModified == 1) {
							++returnObject.updatedDatasets
						}
					}
				}


				const hosts: IHost[] = error.result.result.writeErrors.map((writeError: { err: { op: { url: { hostname: any } } } }) => {
					return new db.host({
						name: writeError.err.op.url.hostname
					})
				})

				try {
					const hostRes = await db.host.insertMany(hosts, {
						ordered: false,
						//@ts-ignore
						forceServerObjectId: true
					})
					returnObject.insertedHosts = hostRes.length
				} catch (error) {
					if (error.code == 11000) {
						returnObject.insertedHosts = error.result.result.writeErrors.length - error.result.result.nInserted
					} else {
						console.log('insert many hosts', error)
					}
				}

			}
			return returnObject

		} else if (error.code == 17280) {
			L.error(error)
			returnObject.insertedDatasets = error.result.result.writeErrors.length - error.result.result.nInserted
			return returnObject
		} else {
			throw error
		}
	}
}

export interface IDatasetModel extends Model < IDataset, typeof datasetQueryHelpers > {
	addMany: (datasets: IDataset[]) => Promise < any > ;
	getDatasetIDsAndHostNamesToBeCrawledOneByHost: () => Promise < any[] > ;
	releaseDatasets: () => any;
	releaseDataset: (id: URL['href']) => Promise < IDataset > ;
	lockDataset: (id: URL['href']) => Promise < IDataset >;
}

datasetSchema.statics.getDatasetIDsAndHostNamesToBeCrawledOneByHost = function (): Promise < IDataset[] > {
	return this.aggregate([
		{ $match: { 'crawl_info.nextCrawl': { $lt: new Date()}}},
		{ $match: { 'crawl_info.currentlyCrawled': false }},
		{ $match: { 'crawl_info.stopped': false }}, 
		{ $sort: { 'crawl_info.nextCrawl': 1 }},
		{ $group: {
			_id: '$url.hostname',
			dataset_url: { '$first': '$id' }}},
		{ $project: {
			hostname: '$_id',
			dataset_url: '$dataset_url'}}
	]).allowDiskUse(true)
}

export default mongoose.model < IDataset, IDatasetModel > ('datasets', datasetSchema)