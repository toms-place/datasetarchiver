//express
import fs from 'fs'
import path from 'path'
import morgan from 'morgan'
import createError from 'http-errors'
import express from 'express'
import cookieParser from 'cookie-parser'
const localPath = process.env.DATASETPATH || './data';
const port = normalizePort(process.env.PORT || '3000');

// create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {
	flags: 'a'
});
// setup the logger
const logger = morgan('combined', {
	stream: accessLogStream
});

let www = express();
www.use(logger);

// view engine setup
www.set('views', path.join(__dirname, 'views'));
www.set('view engine', 'pug');

www.use(express.json());
www.use(express.urlencoded({
	extended: false
}));
www.use(cookieParser());
www.use(express.static(path.join(__dirname, 'public')));

//make localPath public
www.use(express.static(localPath));

//routes setup
const indexRouter = require('./routes/index.js');
const apiRouter = require('./routes/api.js');
www.use('/', indexRouter);
www.use('/api', apiRouter);

/*
fs.readdirSync(path.join(__dirname, 'routes')).map(file => {
  www.use(require('./routes/' + file));
});
*/
// catch 404 and forward to error handler
www.use(function (req, res, next) {
	next(createError(404));
});

// error handler
www.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.www.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});
// Workers can share any TCP connection
// In this case it is an HTTP server

www.set('port', port);

module.exports = www;


/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
	let port = parseInt(val, 10);

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