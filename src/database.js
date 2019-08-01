let mongoose = require('mongoose');
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

const {
  DB_Server,
  DB_Name
} = require('./config');

class Database {
  constructor() {
    this.connection = mongoose.connection
    this._connect()
    this._models()
    this.bucket
  }

  _connect() {
    mongoose.connect(`mongodb://${DB_Server}/${DB_Name}`)
      .then(() => {
        console.log(`Process ${process.pid}: Database connection successful`)
        this.bucket = new mongoose.mongo.GridFSBucket(this.connection.db, {
          bucketName: 'datasets'
        })
      })
      .catch(error => {
        console.error('Database connection error')
      })
  }

  _models() {

    // Mongoose URL schema type setup
    function Url(key, options) {
      mongoose.SchemaType.call(this, key, options, 'Url');
    }
    Url.prototype = Object.create(mongoose.SchemaType.prototype);
    Url.prototype.cast = function (url) {
      if (url instanceof URL) {
        return url;
      } else {
        throw new Error('Url: ' + url + ' is not an url');
      }
    };
    //add to registry
    mongoose.Schema.Types.Url = Url;

    this.dataset = require('./models/dataset');
    this.file = require('./models/file');
    this.host = require('./models/host');
  }

}


module.exports = new Database()