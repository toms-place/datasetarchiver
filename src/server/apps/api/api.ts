import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import path from 'path';
import config from '../../config';
import errorHandler from './middlewares/error.handler';
import router from './router';

const api = express()
//proxy setup
api.set('trust proxy', 'loopback')

//body parser
api.use(bodyParser.json({
  limit: process.env.REQUEST_LIMIT || '100kb'
}));
api.use(bodyParser.urlencoded({
  extended: true,
  limit: process.env.REQUEST_LIMIT || '100kb'
}));

//cookie parser
api.use(cookieParser(process.env.SESSION_SECRET));

//openapi
const apiSpecPath = path.join(__dirname, './api.yml');
api.use(config.OPENAPI_SPEC, express.static(apiSpecPath));

api.use(router)
api.use(errorHandler);

export default api