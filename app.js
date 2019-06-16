const fs = require('fs');

//express
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var morgan = require('morgan');

// create a write stream (in append mode)

let testserver = process.env.TESTSERVER || false;
var accessLogStream;
if (testserver == true) {
  accessLogStream = fs.createWriteStream(path.join(__dirname, 'access_test.log'), {
    flags: 'a'
  });
} else {
  accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {
    flags: 'a'
  });
}
// setup the logger
var logger = morgan('combined', {
  stream: accessLogStream
});


var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');

var app = express();
//use logger
app.use(logger);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//make data public
const localPath = process.env.DATASETPATH || './data'
app.use(express.static(localPath));


app.use('/', indexRouter);
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;