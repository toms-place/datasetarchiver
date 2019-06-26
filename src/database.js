let mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
const {
  DB_Server,
  DB_Name
} = require('./config');

class Database {
  constructor() {
    this._connect()
    this.connection = mongoose.connection
    this.bucket
  }

  _connect() {
    mongoose.connect(`mongodb://${DB_Server}/${DB_Name}`, {
        useNewUrlParser: true
      })
      .then(() => {
        console.log(`Process ${process.pid}: Database connection successful`)
        require('./models/dataset');
        require('./models/file');
        this.bucket = new mongoose.mongo.GridFSBucket(this.connection.db, {
          bucketName: 'datasets'
        })
      })
      .catch(err => {
        console.error('Database connection error')
      })
  }


}


module.exports = new Database()