#!/usr/bin/env node

/**
 * Module dependencies.
 */

const http = require('http');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const app = require('../worker');
//db setup
import mongoose from 'mongoose';




if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {

  mongoose.connection.on('connected', function () {

    /**
     * Get port from environment and store in Express.
     */

    let port = normalizePort(process.env.PORT || '3000');
    app.set('port', port);

    /**
     * Create HTTP server.
     */

    let server = http.createServer(app);

    /**
     * Listen on provided port, on all network interfaces.
     */

    server.listen(port);

    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      var bind = typeof port === 'string' ?
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
    });

    server.on('listening', () => {
      var addr = server.address();
      var bind = typeof addr === 'string' ?
        'pipe ' + addr :
        'port ' + addr.port;
      console.log(`Worker ${process.pid} is listening on ${bind}`)
    });

  });

}




/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

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