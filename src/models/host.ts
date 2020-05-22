import mongoose, {
	Document,
	DocumentQuery,
	Model
} from 'mongoose'
import cf from '../config'
import {
	ObjectId
} from 'mongodb'

export interface IHost extends Document {
	name: string;
	currentlyCrawled: boolean;
	nextCrawl: Date;
	robots_txt: string;
	robots_url: string;
}

const hostQueryHelpers = {
	getHostToCrawl(this: DocumentQuery < any, IHost > , hostname: string) {
		return this.findOne({
			$and: [{
				name: hostname
			}, {
				nextCrawl: {
					$lt: new Date()
				}
			}, {
				currentlyCrawled: false
			}]
		})
	},
	getHostsToCrawl(this: DocumentQuery < any, IHost >) {
		return this.find({
			$and: [{
				nextCrawl: {
					$lt: new Date()
				}
			}, {
				currentlyCrawled: false
			}]
		}).select({ 'name': 1, '_id': 0})
	}
}

export interface IHostModel extends Model < IHost, typeof hostQueryHelpers > {
	lockHost: (hostname: string) => any;
	releaseHostByDsID: (id: ObjectId) => any;
	releaseHost: (hostname: string) => any;
	releaseHosts: () => any;
}

const hostSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true,
		index: true
	},
	currentlyCrawled: {
		type: Boolean,
		default: false,
		index: true
	},
	nextCrawl: {
		type: Date,
		default: new Date(),
		index: true
	},
	robots_txt: {
		type: String,
		default: '',
		index: true
	},
	robots_url: {
		type: String,
		default: '',
		index: true
	}
})

if (cf.PRODUCTION) hostSchema.set('shardKey', {name:1})

hostSchema.query = hostQueryHelpers

hostSchema.statics.lockHost = function (hostname: string) {
	return this.findOneAndUpdate({
		$and: [{
			name: hostname
		}, {
			nextCrawl: {
				$lt: new Date()
			}
		}, {
			currentlyCrawled: false
		}]
	}, {
		$set: {
			currentlyCrawled: true
		}
	}, {
		new: true
	})
}

hostSchema.statics.releaseHosts = function () {
	return this.updateMany({
		currentlyCrawled: true
	}, {
		$set: {
			currentlyCrawled: false,
			nextCrawl: new Date(new Date().getTime() + cf.CRAWL_HostInterval * 1000)
		}
	})
}

// nextCrawl: new Date(new Date().getTime() + cf.CRAWL_HostInterval * 1000)
hostSchema.statics.releaseHost = function (hostname: string) {
	return this.updateOne({
		name: hostname
	}, {
		$set: {
			currentlyCrawled: false
		}
	}).select({ '_id': 1})
}

hostSchema.statics.releaseHostByDsID = function (id: ObjectId) {
	return this.updateOne({
		datasets: id
	}, {
		$set: {
			currentlyCrawled: false,
			nextCrawl: new Date(new Date().getTime() + cf.CRAWL_HostInterval * 1000)
		}
	}).select({ '_id': 1})
}

export default mongoose.model < IHost, IHostModel > ('hosts', hostSchema)