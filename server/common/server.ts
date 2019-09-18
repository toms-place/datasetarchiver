import express from 'express';
import http from 'http';
import path from 'path';
import os from 'os';
import l from './logger';
import config from '../config';
import morgan from 'morgan'
import crawlerAPI from '../apps/api/api'
import viewsAPP from '../apps/browser/app'
var favicon = require('serve-favicon');


const root = path.normalize(__dirname + '/../..');
const app = express();

export default class ExpressServer {
  constructor() {

    //view engine setup
    app.set('view engine', 'pug');
    app.set('views', `${root}/templates`);

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

    app.use(favicon(path.join(__dirname, '../../', 'public', 'api-explorer', 'favicon-32x32.png')));

    //route setup
    app.use(config.endpoint + `/api/v1`, crawlerAPI);
    app.use(config.endpoint + `/public`, express.static(`${root}/public`));
    app.use(config.endpoint + '/', viewsAPP);
    app.use('/', viewsAPP);

  }


  listen(p: string | number = process.env.PORT): http.Server {
    const welcome = port => () => l.info(`up and running in ${process.env.NODE_ENV || 'development'} @: ${os.hostname() } on port: ${port}}`);
    const server = http.createServer(app).listen(p, welcome(p));
    return server;
  }
}