let mongoose = require('mongoose');
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
//mongoose.set('debug', true);

const sleep = require('util').promisify(setTimeout);

const {
  DB_Server,
  DB_Name
} = require('./config');

let instance = null;

class Database {
  constructor() {
    this._conn = mongoose.connection
    this._bucket = null
    this._models()
  }

  async connect() {
    try {
      await mongoose.connect(`mongodb://${DB_Server}/${DB_Name}`, {
        autoIndex: true,
        reconnectTries: Number.MAX_VALUE
      })
      console.log(`Process ${process.pid}: Database connection successful`)

      this._bucket = await new mongoose.mongo.GridFSBucket(this.conn.db, {
        bucketName: 'datasets'
      })
      console.log(`Process ${process.pid}: Bucket connection successful`)

      this.conn.on('disconnected', () => {
        console.log('db disconnected')
      })

    } catch (error) {
      console.log(error.message)
      await sleep(10000)
      console.log('reconnecting')
      this.connect()
    }
  }

  get conn() {
    return this._conn
  }

  get bucket() {
    return this._bucket
  }

  _models() {
    this.dataset = require('./models/dataset');
    this.file = require('./models/file');
  }

  static getInstance() {
    if (!instance) {
      instance = new Database()
      instance.connect()
    }
    return instance;
  }

}


module.exports = Database;