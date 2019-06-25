#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require('../worker');
var http = require('http');

//db setup
import mongoose from 'mongoose';

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
    console.log('Listening on ' + bind)
  });

});

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