let mongoose = require('mongoose');
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

const {
  DB_Server,
  DB_Name
} = require('./config');

let instance = null;

class Database {
  constructor() {
    this._conn = null
    this._bucket = null
    this._models()
  }

  async connect() {
    try {
      this._conn = await mongoose.connect(`mongodb://${DB_Server}/${DB_Name}`, {
        autoIndex: false
      })
      console.log(`Process ${process.pid}: Database connection successful`)

      this._bucket = new mongoose.mongo.GridFSBucket(this._conn.connections[0].db, {
        bucketName: 'datasets'
      })
      console.log(`Process ${process.pid}: Bucket connection successful`)

    } catch (error) {
      throw(error)
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
    this.host = require('./models/host');
  }

  static getInstance() {
    if (!instance) {
      instance = new Database()
    }
    return instance;
  }

}


module.exports = Database;