import mongoose, {
	Document,
	DocumentQuery,
	Model
} from 'mongoose';
import config from '../../../config';
import {
	ObjectId
} from "bson";

export interface IHost extends Document {
	name: string,
	currentlyCrawled: boolean,
	nextCrawl: Date,
	datasets: number[]
}

export interface IHostModel extends Model < IHost, typeof hostQueryHelpers > {
	lockHost: (id: ObjectId) => any,
	releaseHostByDsID: (id: ObjectId) => any,
	releaseHost: (hostname: String) => any,
	releaseHosts: () => any
}

let hostSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true
	},
	currentlyCrawled: {
		type: Boolean,
		default: false
	},
	nextCrawl: {
		type: Date,
		default: new Date()
	},
	datasets: [{
		type: mongoose.SchemaTypes.ObjectId,
	}]
})

let hostQueryHelpers = {
	getHostToCrawl(this: DocumentQuery < any, IHost > , hostname: String) {
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
		})
	}
};

hostSchema.query = hostQueryHelpers

hostSchema.statics.lockHost = function (id: ObjectId) {
	return this.findOneAndUpdate({
		$and: [{
			datasets: id
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
};

hostSchema.statics.releaseHosts = function () {
	return this.updateMany({}, {
		$set: {
			currentlyCrawled: false,
			nextCrawl: new Date(new Date().getTime() + config.CRAWL_HostInterval * 1000)
		}
	});
};

hostSchema.statics.releaseHost = function (hostname) {
	return this.updateOne({
		name: hostname
	}, {
		$set: {
			currentlyCrawled: false,
			nextCrawl: new Date(new Date().getTime() + config.CRAWL_HostInterval * 1000)
		}
	});
};

hostSchema.statics.releaseHostByDsID = function (id: ObjectId) {
	return this.updateOne({
		datasets: id
	}, {
		$set: {
			currentlyCrawled: false,
			nextCrawl: new Date(new Date().getTime() + config.CRAWL_HostInterval * 1000)
		}
	});
};

export default mongoose.model < IHost, IHostModel > ('hosts', hostSchema)