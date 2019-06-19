"use strict";

var _http = _interopRequireDefault(require("http"));

var _debug = _interopRequireDefault(require("debug"));

var _www = _interopRequireDefault(require("./www.js"));

var _cluster = _interopRequireDefault(require("cluster"));

var _database = _interopRequireDefault(require("./database.js"));

var _dataset = _interopRequireDefault(require("./models/dataset.js"));

var _crawler = _interopRequireDefault(require("./crawler.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const debug = (0, _debug.default)('archiver:server');
const port = normalizePort(process.env.PORT || '3000'); //cluster

const numCPUs = require('os').cpus().length;

const sleep = require('util').promisify(setTimeout); //crawler & db setup


startCluster();

function startCluster() {
  if (_cluster.default.isMaster) {
    console.log(`Master ${process.pid} is running`); // Fork workers.

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
  /**
   * Create HTTP server.
   */
  let server = _http.default.createServer(_www.default);
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