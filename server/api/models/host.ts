import mongoose, {
	Document,
	DocumentQuery,
	Model
} from 'mongoose';

export interface IHost extends Document {
	name: string,
	currentlyCrawled: boolean,
	nextCrawl: Date,
	datasets: number[]
}

export interface IHostModel extends Model<IHost, typeof hostQueryHelpers> {}

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
	getHostToCrawl(this: DocumentQuery < any, IHost > , hostname) {
		return this.findOne({
			$and: [{
				name: hostname
			}, {
				nextCrawl: {
					$lt: new Date()
				}
			}]
		})
	},
	getHostsToCrawl(this: DocumentQuery < any, IHost > ) {
		return this.find({
			nextCrawl: {
				$lt: new Date()
			}
		})
	}
};

hostSchema.query = hostQueryHelpers

export default mongoose.model<IHost, IHostModel>('hosts', hostSchema)