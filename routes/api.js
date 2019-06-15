var express = require('express');
var router = express.Router();
const DatasetModel = require('../models/dataset.js')
const Crawlers = require('../src/crawlers.js');
const Crawler = require('../src/crawler.js');

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('See docs for api');
});

router.get('/add', function (req, res, next) {
  if (req.query.url) {
    console.log("add emmitted for", req.query.url);
    new DatasetModel({
        url: req.query.url
      }).save()
      .then(doc => {
        Crawlers[req.query.url] = new Crawler(doc.url);
        console.log(Crawlers[req.query.url]);
        res.send('Now crawling:' + req.query.url);
      })
      .catch(err => {
        console.error(err)
        res.status(404).send(err);
      })
  } else {
    res.status(404).send('give me an url');
  }
});

router.get('/quit', function (req, res, next) {
  if (req.query.url) {
    if (Crawlers[req.query.url]) {
      console.log("quit emmitted for", req.query.url);
      console.log(Crawlers[req.query.url]);
      Crawlers[req.query.url].quit();
      res.send('Stopped crawling:' + req.query.url);
    } else {
      res.status(404).send(`${req.query.url} is not in our db. If you want to add it, try /api/add?url=`);
    }
  } else {
    res.status(404).send('give me an url');
  }
});

router.get('/start', async function (req, res, next) {
  if (req.query.url) {

    let dataset = await DatasetModel.findOne({
      url: req.query.url
    }).exec();

    if (dataset) {
      Crawlers[req.query.url].start();
      res.send('Started crawling:' + req.query.url);
    } else {
      res.status(404).send(`${req.query.url} is not in our db. If you want to add it, try /api/add?url=`);
    }
  } else {
    res.status(404).send('give me an url');
  }
});



module.exports = router;