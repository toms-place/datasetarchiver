import express from 'express';
import controller from './controllers/controller'
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import path from 'path';
import config from '../../config';
import errorHandler, {
  errorEmitter
} from './middlewares/error.handler';

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

//routes
api.get('/crawlHref', controller.crawlHref)
api.get('/crawlHrefSync', controller.crawlHrefSync)
api.get('/getVersions', controller.getVersions)
api.get('/dumpLastVersions', controller.dumpLastVersions)
api.get('/getFiles', controller.getFiles)
api.get('/getFile', controller.getFile)
api.get('/getDatasets', controller.getDatasets)
api.get('/getDataset', controller.getDataset)
api.post('/addHref', controller.addHref)
api.post('/addManyHrefs', controller.addManyHrefs)
api.post('/crawlID', controller.crawlID)

api.use('/\*', errorEmitter);
api.use(errorHandler);

export default api