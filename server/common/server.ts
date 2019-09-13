import express from 'express';
import {
  Application
} from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import http from 'http';
import os from 'os';
import cookieParser from 'cookie-parser';
import config from '../config';
import installValidator from './openapi';
import l from './logger';
import morgan from 'morgan'


const app = express();

export default class ExpressServer {
  constructor() {
    const root = path.normalize(__dirname + '/../..');

    //logger setup
    app.use(morgan('combined', {
      stream: require('file-stream-rotator').getStream({
        filename: path.join(root, 'access_%DATE%.log'),
        frequency: 'daily',
        verbose: false,
        date_format: 'YYYYMMDD'
      })
    }));

    //static route setup
    app.use(`${config.endpoint}`, express.static(`${root}/public`));

    //view engine setup
    app.set('view engine', 'pug');
    app.set('views', `${root}/templates`);

    //proxy setup
    app.set('trust proxy', 'loopback')

    //body parser
    app.use(bodyParser.json({
      limit: process.env.REQUEST_LIMIT || '100kb'
    }));
    app.use(bodyParser.urlencoded({
      extended: true,
      limit: process.env.REQUEST_LIMIT || '100kb'
    }));

    //cookie parser
    app.use(cookieParser(process.env.SESSION_SECRET));

  }

  router(routes: (app: Application) => void): ExpressServer {
    installValidator(app, routes)
    return this;
  }

  listen(p: string | number = process.env.PORT): Application {
    const welcome = port => () => l.info(`up and running in ${process.env.NODE_ENV || 'development'} @: ${os.hostname() } on port: ${port}}`);
    http.createServer(app).listen(p, welcome(p));
    return app;
  }
}