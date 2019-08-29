#!/usr/bin/env node

const http = require('http');
let app = require('./app_setup');
let server = null;

//db setup
const db = require('./database').getInstance();
const dbEmitter = require('./events/dbEvents');

dbEmitter.on('connected', () => {

  server = http.createServer(app);
  server.listen(app.settings.port);

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
    console.log(`Process ${process.pid}: listening on ${bind}`)
  });
})