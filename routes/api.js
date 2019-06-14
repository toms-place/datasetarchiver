var express = require('express');
var router = express.Router();
const urlEmitter = require('../src/events/urlEmitter.js');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/add', function(req, res, next) {
  if (req.query.url) {
    urlEmitter.emit('addUrl', req.query.url);
    res.send('Now crawling:' + req.query.url);
  } else {
    res.send('give me an url');
  }
});

router.get('/stop', function(req, res, next) {
  if (req.query.url) {
    urlEmitter.emit('stopUrl', req.query.url);
    res.send('Stopped crawling:' + req.query.url);
  } else {
    res.send('give me an url');
  }
});

router.get('/start', function(req, res, next) {
  if (req.query.url) {
    urlEmitter.emit('startUrl', req.query.url);
    res.send('Started crawling:' + req.query.url);
  } else {
    res.send('give me an url');
  }
});



module.exports = router;
