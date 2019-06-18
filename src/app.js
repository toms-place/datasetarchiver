//express
import fs from 'fs'
import createError from 'http-errors'
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import http from 'http'
import debugLib from 'debug'
const debug = debugLib('archiver:server');
const port = normalizePort(process.env.PORT || '3000');
const localPath = process.env.DATASETPATH || './data';

// create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {
  flags: 'a'
});
// setup the logger
const logger = morgan('combined', {
  stream: accessLogStream
});

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
    //start crawlers distributed on clusters at init
    DatasetModel.getDatasets().then((datasets) => {
      let data4workers = {};
      for (let w = 1; w < numCPUs + 1; w++) {
        data4workers[w] = [];
      }
  
      //set up all datasets for the workers
      let dL = datasets.length;
      let counter = 1;
      for (let i = 0; i < dL; i++) {
        for (let w = 1; w < numCPUs + 1; w++) {
          if (counter == w) {
            data4workers[w].push(datasets[i]);
            if (counter < numCPUs) counter++;
            else counter = 1;
            break;
          }
        }
      }

      // Fork workers.
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }

      cluster.on('listening', (worker, address) => {

        worker.send(data4workers[worker.id]);
        console.log(`A worker is now connected to ${address.address}:${address.port}`);
      });
  
      cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
      });

    }).catch(err => {
        console.error(err)
      })

  } else {
    let app = express();
    app.use(logger);

    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'pug');

    app.use(express.json());
    app.use(express.urlencoded({
      extended: false
    }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));

    //make localPath public
    app.use(express.static(localPath));

    //routes setup
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
      next(createError(404));
    });

    // error handler
    app.use(function (err, req, res, next) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      // render the error page
      res.status(err.status || 500);
      res.render('error');
    });
    // Workers can share any TCP connection
    // In this case it is an HTTP server

    app.set('port', port);

    /**
     * Create HTTP server.
     */

    let server = http.createServer(app);

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

    process.on('message', (datasets) => {
      for (let dataset of datasets) {
        let crawler = new Crawler(dataset);
        console.log(`${process.pid} started: ${crawler.url}`)
      }
    });

    console.log(`Worker ${process.pid} started`);
  }
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