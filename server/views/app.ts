import express from 'express';
import controller from './controller'
import cookieParser from 'cookie-parser';
import path from 'path';
import bodyParser from 'body-parser';
import errorHandler from '../common/middlewares/error.handler';

let app = express()
const root = path.normalize(__dirname + '/../..');

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

app.get('/', controller.index)
app.get('/api-explorer', controller.explorer)



//view engine setup
//app.set('view engine', 'pug');
//app.set('views', `${root}/templates`);


app.use(function (err, req, res, next) {
  console.log('Error in app');
  res.status(500).send('Error: ' + err.message);
});

export default app