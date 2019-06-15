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

    new DatasetModel({
        url: req.query.url
      }).save()
      .then(dataset => {
        Crawlers[req.query.url] = new Crawler(dataset.url);
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

router.get('/quit', async function (req, res, next) {
  if (req.query.url) {

    let dataset = await DatasetModel.findOne({
      url: req.query.url
    }).exec();

    if (dataset) {
      if (Crawlers[req.query.url] && dataset.stopped != true) {
        Crawlers[req.query.url].quit();
        res.send('Stopped crawling:' + req.query.url);
      } else {
        res.status(404).send(`${req.query.url} is already stopped`);
      }
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
      if (dataset.stopped == true) {
        Crawlers[req.query.url].start();
        res.send('Started crawling:' + req.query.url);
      } else {
        res.status(404).send(`${req.query.url} already started`);
      }
    } else {
      res.status(404).send(`${req.query.url} is not in our db. If you want to add it, try /api/add?url=`);
    }
  } else {
    res.status(404).send('give me an url');
  }
});

router.get('/get', async function (req, res, next) {
  if (req.query.url) {

    let dataset = await DatasetModel.findOne({
      url: req.query.url
    }).exec();

    if (dataset) {
      if (req.query.v < dataset.versionCount) {
        res.download(dataset.path + "/" + req.query.v + "/" + dataset.filename + ".gz", dataset.host + "_v" + req.query.v + "_" + dataset.filename + ".gz");
      } else if (req.query.v == "all") {
        //TODO send zip!
        console.log("send zip");
        res.status(404).send(`I can not send a zip right now`);
      } else {
        let version = dataset.versionCount - 1;
        res.download(dataset.path + "/" + version + "/" + dataset.filename + ".gz", dataset.host + "_v" + version + "_" + dataset.filename + ".gz");
      }
    } else {
      res.status(404).send(`${req.query.url} is not in our db. If you want to crawl it, try /api/add?url=`);
    }
  } else {
    res.status(404).send('give me an url');
  }
});


module.exports = router;