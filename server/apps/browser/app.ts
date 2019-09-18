import express from 'express';
import controller from './controller'
import cookieParser from 'cookie-parser';
import path from 'path';
import bodyParser from 'body-parser';
import errorHandler, {
  errorEmitter
} from './middlewares/error.handler';
import config from '../../config';

const app = express()
const root = path.normalize(__dirname + '/../../..');

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

//view engine setup
app.set('view engine', 'pug');
app.set('views', `${root}/templates`);

//cookie parser
app.use(cookieParser(process.env.SESSION_SECRET));

//routes
app.get('/', controller.index)
app.get('/api-explorer', controller.explorer)

app.use('/\*', (req, res) => {
  res.redirect(config.endpoint + '/')
});

//app.use('/\*', errorEmitter);
app.use(errorHandler);

export default app