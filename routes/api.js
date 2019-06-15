var express = require('express');
var router = express.Router();
const crawlEmitter = require('../src/events/crawlEmitter.js');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('See docs for api');
});

router.get('/add', function(req, res, next) {
  if (req.query.url) {
    crawlEmitter.emit('addCrawl', req.query.url);
    res.send('Now crawling:' + req.query.url);
  } else {
    res.status(404).send('give me an url');
  }
});

router.get('/quit', function(req, res, next) {
  if (req.query.url) {
    crawlEmitter.emit('quitCrawl', req.query.url);
    res.send('Stopped crawling:' + req.query.url);
  } else {
    res.status(404).send('give me an url');
  }
});

router.get('/start', function(req, res, next) {
  if (req.query.url) {
    crawlEmitter.emit('startCrawl', req.query.url);
    res.send('Started crawling:' + req.query.url);
  } else {
    res.status(404).send('give me an url');
  }
});



module.exports = router;
