"use strict";

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _morgan = _interopRequireDefault(require("morgan"));

var _httpErrors = _interopRequireDefault(require("http-errors"));

var _express = _interopRequireDefault(require("express"));

var _cookieParser = _interopRequireDefault(require("cookie-parser"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//express
const localPath = process.env.DATASETPATH || './data';
const port = normalizePort(process.env.PORT || '3000'); // create a write stream (in append mode)

const accessLogStream = _fs.default.createWriteStream(_path.default.join(__dirname, 'access.log'), {
  flags: 'a'
}); // setup the logger


const logger = (0, _morgan.default)('combined', {
  stream: accessLogStream
});
let www = (0, _express.default)();
www.use(logger); // view engine setup

www.set('views', _path.default.join(__dirname, 'views'));
www.set('view engine', 'pug');
www.use(_express.default.json());
www.use(_express.default.urlencoded({
  extended: false
}));
www.use((0, _cookieParser.default)());
www.use(_express.default.static(_path.default.join(__dirname, 'public'))); //make localPath public

www.use(_express.default.static(localPath)); //routes setup

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
  next((0, _httpErrors.default)(404));
}); // error handler

www.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.www.get('env') === 'development' ? err : {}; // render the error page

  res.status(err.status || 500);
  res.render('error');
}); // Workers can share any TCP connection
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