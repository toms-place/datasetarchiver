import express from 'express';
import http from 'http';
import path from 'path';
import os from 'os';
import l from './logger';
import config from '../config';
import morgan from 'morgan'
import crawlerAPI from '../apps/api/api'
import schedulerAPI from '../apps/scheduler/scheduler'
import viewsAPP from '../apps/browser/app'
var favicon = require('serve-favicon');
import cors from 'cors'
const pathToSwaggerUi = require('swagger-ui-dist').absolutePath()

const root = path.normalize(__dirname + '/../..');
const app = express();

export default class ExpressServer {
  constructor() {

    //view engine setup
    app.set('view engine', 'pug');
    app.set('views', `${root}/templates`);

    app.use(cors())

    //logger setup
    app.use(morgan('combined', {
      stream: require('file-stream-rotator').getStream({
        filename: path.join(root, 'access_%DATE%.log'),
        frequency: 'daily',
        verbose: false,
        date_format: 'YYYYMMDD'
      })
    }));

    //installValidator(app)

    app.use(favicon(path.join(root, 'public', 'api-explorer', 'favicon-32x32.png')));

    //route setup
    if (config.mode == 'scheduler') {
      app.use(config.endpoint + `/`, schedulerAPI);
      app.use('/', schedulerAPI);
    } else {
      app.use(config.endpoint + `/api/v1`, crawlerAPI);
      app.use(config.endpoint + `/public`, express.static(`${root}/public`));
      app.use(config.endpoint + `/swagger`, express.static(pathToSwaggerUi))
      app.use(config.endpoint + '/', viewsAPP);
      app.use('/', viewsAPP);
    }

  }


  listen(p: string | number = process.env.PORT): http.Server {
    const welcome = port => () => l.info(`up and running in ${process.env.NODE_ENV || 'development'} @: ${os.hostname() } on port: ${port}}`);
    const server = http.createServer(app).listen(p, welcome(p));
    return server;
  }
}