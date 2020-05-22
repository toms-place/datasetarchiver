import config from '../config'
import mongoose, {
	Mongoose
} from 'mongoose'
import {
	GridFSBucket
} from 'mongodb'
import datasetModel, {
	IDatasetModel
} from '../models/dataset'
import fileModel, {
	IFileModel
} from '../models/file'
import hostModel, {
	IHostModel
} from '../models/host'
import sourceModel, {
	ISourceModel
} from '../models/source'

mongoose.set('useNewUrlParser', true)
mongoose.set('useFindAndModify', false)
mongoose.set('useCreateIndex', true)
mongoose.set('useUnifiedTopology', true)
if (config.DEBUG) mongoose.set('debug', true)

const sleep = require('util').promisify(setTimeout)

let instance: Database = null

mongoose.connection.on('connecting', () => {
	console.log(`Process ${process.pid}: Database tries to connect`)
})

mongoose.connection.on('connected', () => {
	console.log(`Process ${process.pid}: Database connection successful`)
})

mongoose.connection.on('reconnected', () => {
	console.log(`Process ${process.pid}: Database reconnected`)
})

export class Database {
	private _conn: Mongoose['connection'];
	private _bucket: GridFSBucket;
	public dataset: IDatasetModel;
	public host: IHostModel;
	public file: IFileModel;
	public source: ISourceModel;
	public mongoose: Mongoose;

	constructor() {
		this._conn = mongoose.connection
		this._bucket = GridFSBucket.prototype
		this.mongoose = mongoose
		this._models()
	}

	private async connect(poolSize?: number) {
		try {
			await mongoose.connect(`mongodb://${config.DB_Server}/${config.DB_Name}`, {
				autoIndex: true,
				poolSize: poolSize | config.DB_Poolsize
			})
			this._bucket = new mongoose.mongo.GridFSBucket(this.conn.db, {
				bucketName: 'datasets'
			})
			console.log(`Process ${process.pid}: Bucket connection successful`)
			this.conn.emit('setup')
			
		} catch  (error) {
			console.log(error.message)
			await sleep(10000)
			this.connect(config.DB_Poolsize)
		}
	}

	get conn() {
		return this._conn
	}

	get bucket(): GridFSBucket {
		return this._bucket
	}

	_models() {
		this.dataset = datasetModel
		this.host = hostModel
		this.file = fileModel
		this.source = sourceModel
	}

	static getInstance(): Database {
		if (!instance) {
			instance = new Database()
			instance.connect()
		}
		return instance
	}

}

export default Database.getInstance()