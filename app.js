//crawler app
var db = require('./database.js');
const DatasetModel = require('./models/dataset.js');
const Crawlers = require('./src/crawlers.js');
const Crawler = require('./src/crawler.js');

//start crawlers on init
DatasetModel.getDatasets()
  .then(datasets => {
    for (dataset of datasets) {
      Crawlers[dataset.url] = new Crawler(dataset.url);
      console.log('started:', Crawlers[dataset.url]);
    }
  })
  .catch(err => {
    console.error(err)
  })


//express
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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