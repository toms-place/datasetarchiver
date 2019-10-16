import config from '../config';
import mongoose, {
  Mongoose
} from 'mongoose';
import {
  GridFSBucket
} from 'mongodb';
import datasetModel, {
  IDatasetModel
} from '../apps/api/models/dataset';
import fileModel, {
  IFileModel
} from '../apps/api/models/file';
import hostModel, {
  IHostModel
} from '../apps/api/models/host';

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
//mongoose.set('debug', true);

const sleep = require('util').promisify(setTimeout);

let instance = null;

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
  _conn: Mongoose['connection'];
  _bucket: GridFSBucket;
  dataset: IDatasetModel;
  host: IHostModel;
  file: IFileModel;
  mongoose: Mongoose;

  constructor() {
    this._conn = mongoose.connection
    this._bucket = null;
    this._models()
  }

  async connect(poolSize: number) {
    mongoose.connect(`mongodb://${config.DB_Server}/${config.DB_Name}`, {
      autoIndex: true,
      reconnectTries: Number.MAX_VALUE,
      poolSize: poolSize
    }).then(() => {
      this._bucket = new mongoose.mongo.GridFSBucket(this.conn.db, {
        bucketName: 'datasets'
      })
      console.log(`Process ${process.pid}: Bucket connection successful`)
    }).catch(async (error) => {
      console.log(error.message)
      await sleep(10000)
      this.connect(config.DB_Poolsize)
    })
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
  }

  static getInstance(): Database {
    if (!instance) {
      instance = new Database()
      instance.connect()
    }
    return instance;
  }

}

export default Database.getInstance()