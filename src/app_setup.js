//express
import fs from 'fs'
import path from 'path'
import morgan from 'morgan'
import createError from 'http-errors'
import express from 'express'
import cookieParser from 'cookie-parser'
import { resolveNaptr } from 'dns';

const {
	port,
	endpoint,
	env
} = require('./config');

const localPath = process.env.DATASETPATH || './data';
// create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {
	flags: 'a'
});
// setup the logger
const logger = morgan('dev', {
	stream: accessLogStream
});

let app = express();
app.use(logger);

//proxy setup
app.set('trust proxy', 'loopback')

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({
	extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//make localPath public
app.use(express.static(localPath));

//routes setup
const indexRouter = require('./routes/index.js');
const apiRouter = require('./routes/api.js');
if (env == 'production') {
	app.use(`/${endpoint}`, indexRouter);
	app.use(`/${endpoint}/api`, apiRouter);
} else {
	app.use('/', indexRouter);
	app.use('/api', apiRouter);
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (error, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = error.message;
	res.locals.error = req.app.get('env') === 'development' ? error : {};

	// render the error page
	res.status(error.status || 500);
	res.render('error');
});

/**
 * Get port from environment and store in Express.
 */
let port2use = normalizePort(port || '3000');
app.set('port', port2use);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
	var port = parseInt(val, 10);
  
	if (isNaN(port)) {
	  // named pipe
	  return val;
	}
  
	if (port >= 0) {
	  // port number
	  return port;
	}
  
	return false;
  }



module.exports = app;