import express from 'express';
import controller from './controller'
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import installValidator from './openapi';
import errorHandler from '../../common/middlewares/error.handler';

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

installValidator(api)

api.get('/addHref', controller.addHref)
api.get('/addManyHrefs', controller.addManyHrefs)
api.get('/crawlHref', controller.crawlHref)
api.get('/crawlHrefSync', controller.crawlHrefSync)
api.get('/crawlID', controller.crawlID)


api.use('/', function (req, res, next) {
  throw new Error('test')
});

api.use(function (err, req, res, next) {
  console.log('Error handler');
  next(err);
});

export default api