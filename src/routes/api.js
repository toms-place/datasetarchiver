const express = require('express');
const router = express.Router();
const DatasetModel = require('../models/dataset.js');
const Crawler = require('../crawler.js');
const root = process.env.DATASETPATH || './data';

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('See docs for api');
});

router.get('/add', function (req, res, next) {
  if (req.query.url) {

    let urlPathArray = req.query.url.split('/');
    let host = urlPathArray[2];
    let filename = urlPathArray[urlPathArray.length - 1];
    let path = host + "/" + filename;
    let versions = [];

    let storage = {
      host: host,
      filename: filename,
      root: root,
      path: path
    }

    new DatasetModel({
        url: req.query.url,
        storage: storage,
        versions: versions
      }).save()
      .then(dataset => {
        let crawler = new Crawler(dataset);
        console.log(`${process.pid} started: ${crawler.url}`)
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
      if (dataset.stopped != true) {
        dataset.stopped = true;
        await dataset.save();
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
        dataset.stopped = false;
        await dataset.save();
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
      if (req.query.v < dataset.nextVersionCount) {
        res.download(dataset.versions[req.query.v].storage.root + "/" + dataset.versions[req.query.v].storage.path);
      } else if (req.query.v == "all") {
        //TODO send zip!
        console.log("send zip");
        res.status(404).send(`I can not send a zip right now`);
      } else {
        let version = dataset.nextVersionCount - 1;
        res.download(dataset.versions[version].storage.root + "/" + dataset.versions[version].storage.path);
      }
    } else {
      res.status(404).send(`${req.query.url} is not in our db. If you want to crawl it, try /api/add?url=`);
    }
  } else {
    res.status(404).send('give me an url');
  }
});


module.exports = router;


function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}