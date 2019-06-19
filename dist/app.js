"use strict";

var _fs = _interopRequireDefault(require("fs"));

var _httpErrors = _interopRequireDefault(require("http-errors"));

var _express = _interopRequireDefault(require("express"));

var _path = _interopRequireDefault(require("path"));

var _cookieParser = _interopRequireDefault(require("cookie-parser"));

var _morgan = _interopRequireDefault(require("morgan"));

var _http = _interopRequireDefault(require("http"));

var _debug = _interopRequireDefault(require("debug"));

var _cluster = _interopRequireDefault(require("cluster"));

var _database = _interopRequireDefault(require("./database.js"));

var _dataset = _interopRequireDefault(require("./models/dataset.js"));

var _crawler = _interopRequireDefault(require("./crawler.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//express
const debug = (0, _debug.default)('archiver:server');
const port = normalizePort(process.env.PORT || '3000');
const localPath = process.env.DATASETPATH || './data'; // create a write stream (in append mode)

const accessLogStream = _fs.default.createWriteStream(_path.default.join(__dirname, 'access.log'), {
  flags: 'a'
}); // setup the logger


const logger = (0, _morgan.default)('combined', {
  stream: accessLogStream
}); //cluster

const numCPUs = require('os').cpus().length;

const sleep = require('util').promisify(setTimeout); //crawler & db setup


startCluster();

function startCluster() {
  if (_cluster.default.isMaster) {
    console.log(`Master ${process.pid} is running`);

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
      _cluster.default.fork();
    }

    _cluster.default.on('listening', async (worker, address) => {
      console.log(`A worker is now connected to ${address.address}:${address.port}`);
    });

    _cluster.default.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
    });
  } else {
    startServer();
  }

  if (_cluster.default.isMaster) {
    tickMaster(300000);
  }
}

function tickMaster(time) {
  _dataset.default.getDatasets().then(async datasets => {
    //set up all datasets for the workers
    let wL = Object.keys(_cluster.default.workers).length;
    let dL = datasets.length;
    let counter = 1;

    for (let i = 0; i < dL; i++) {
      if (datasets[i].nextCrawl <= new Date() && datasets[i].stopped != true) {
        for (let w = 1; w < wL + 1; w++) {
          if (counter == w) {
            _cluster.default.workers[w].send(datasets[i]);

            if (counter < wL) counter++;else counter = 1;
            break;
          }
        }
      }
    }

    console.log(`Master ${process.pid} ticked`);
    await sleep(time);
    tickMaster(time);
  }).catch(err => {
    console.error(err);
  });
}

function startServer() {
  let app = (0, _express.default)();
  app.use(logger); // view engine setup

  app.set('views', _path.default.join(__dirname, 'views'));
  app.set('view engine', 'pug');
  app.use(_express.default.json());
  app.use(_express.default.urlencoded({
    extended: false
  }));
  app.use((0, _cookieParser.default)());
  app.use(_express.default.static(_path.default.join(__dirname, 'public'))); //make localPath public

  app.use(_express.default.static(localPath)); //routes setup

  const indexRouter = require('./routes/index.js');

  const apiRouter = require('./routes/api.js');

  app.use('/', indexRouter);
  app.use('/api', apiRouter);
  /*
  fs.readdirSync(path.join(__dirname, 'routes')).map(file => {
    app.use(require('./routes/' + file));
  });
  */
  // catch 404 and forward to error handler

  app.use(function (req, res, next) {
    next((0, _httpErrors.default)(404));
  }); // error handler

  app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {}; // render the error page

    res.status(err.status || 500);
    res.render('error');
  }); // Workers can share any TCP connection
  // In this case it is an HTTP server

  app.set('port', port);
  /**
   * Create HTTP server.
   */

  let server = _http.default.createServer(app);
  /**
   * Listen on provided port, on all network interfaces.
   */


  server.listen(port);
  server.on('error', onError);
  server.on('listening', () => {
    let addr = server.address();
    let bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    debug('Listening on ' + bind);
  });
  process.on('message', dataset => {
    let crawler = new _crawler.default(dataset);
    console.log(`${process.pid} started: ${crawler.url}`);
  });
  console.log(`Worker ${process.pid} started`);
}
/**
 * Normalize a port into a number, string, or false.
 */


function normalizePort(val) {
  let port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
/**
 * Event listener for HTTP server "error" event.
 */


function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  let bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port; // handle specific listen errors with friendly messages

  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;

    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;

    default:
      throw error;
  }
}