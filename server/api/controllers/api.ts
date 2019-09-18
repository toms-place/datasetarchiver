import express, {
  Application
} from 'express';
import controller from './controller'
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import path from 'path';
import config from '../../config';
import errorHandler, {
  errorEmitter
} from '../middlewares/error.handler';

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
const apiSpecPath = path.join(__dirname, '../api.yml');
api.use(`${config.endpoint + config.OPENAPI_SPEC}`, express.static(apiSpecPath));

//routes
api.get('/addHref', controller.addHref)
api.get('/addManyHrefs', controller.addManyHrefs)
api.get('/crawlHref', controller.crawlHref)
api.get('/crawlHrefSync', controller.crawlHrefSync)
api.get('/crawlID', controller.crawlID)

api.use('/\*', errorEmitter);
api.use(errorHandler);

export default api