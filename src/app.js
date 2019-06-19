import http from 'http'
import debugLib from 'debug'
import www from './www.js';
const debug = debugLib('archiver:server');
const port = normalizePort(process.env.PORT || '3000');

//cluster
import cluster from 'cluster';
const numCPUs = require('os').cpus().length;
const sleep = require('util').promisify(setTimeout);

//crawler & db setup
import db from './database.js';
import DatasetModel from './models/dataset.js';
import Crawler from './crawler.js';

startCluster();

function startCluster() {
  if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('listening', async (worker, address) => {
      console.log(`A worker is now connected to ${address.address}:${address.port}`);
    });

    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
    });

  } else {
    startServer();
  }
  if (cluster.isMaster) {
    tickMaster(300000);
  }
}

function tickMaster(time) {

  DatasetModel.getDatasets().then(async (datasets) => {

    //set up all datasets for the workers
    let wL = Object.keys(cluster.workers).length
    let dL = datasets.length;
    let counter = 1;
    for (let i = 0; i < dL; i++) {
      if (datasets[i].nextCrawl <= new Date() && datasets[i].stopped != true) {
        for (let w = 1; w < wL + 1; w++) {
          if (counter == w) {

            cluster.workers[w].send(datasets[i]);

            if (counter < wL) counter++;
            else counter = 1;
            break;
          }
        }
      }
    }

    console.log(`Master ${process.pid} ticked`);
    await sleep(time);
    tickMaster(time);

  }).catch(err => {
    console.error(err)
  })
}

function startServer() {


  /**
   * Create HTTP server.
   */
  let server = http.createServer(www);

  /**
   * Listen on provided port, on all network interfaces.
   */
  server.listen(port);
  server.on('error', onError);
  server.on('listening', () => {
    let addr = server.address();
    let bind = typeof addr === 'string' ?
      'pipe ' + addr :
      'port ' + addr.port;
    debug('Listening on ' + bind);
  });

  process.on('message', (dataset) => {
    let crawler = new Crawler(dataset);
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

  let bind = typeof port === 'string' ?
    'Pipe ' + port :
    'Port ' + port;

  // handle specific listen errors with friendly messages
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