import Crawler from '../utils/crawler';
const rp = require('request-promise-native');
const express = require('express');
const router = express.Router();
const DatasetModel = require('../models/dataset.js');

router.get('/', function (req, res, next) {
  res.send('See docs for api');
});

router.post('/add', function (req, res, next) {
  if (req.query.url) {

    //TODO check header to acquire needed informaiton
    rp.head(req.query.url).then((header) => {

      if (header['content-type'].includes('text/html')) {
        res.status(404).send('This is a Website!!');
      } else {
        let url = new URL(req.query.url);
        let filename = url.pathname.split('/')[url.pathname.split('/').length - 1]
        let versions = [];

        new DatasetModel({
          url: url,
            versions: versions,
            filename: filename
          }).save()
          .then(dataset => {
            console.log(`Worker ${process.pid} added ${dataset.url} to DB`);
            res.send(`Worker ${process.pid} added ${dataset.url} to DB`);
          })
          .catch(err => {
            if (err.code == 11000) {
              console.error(`${url.href} already in DB`)
              res.status(404).send(`${url.href} already in DB`);
            } else {
              console.error(err)
              res.status(404).send(err);
            }
          })
      }
    }).catch((err) => {
      res.status(404).send(err);
    })

  } else {
    res.status(404).send('give me an url');
  }
});

router.get('/crawl', async function (req, res, next) {
  if (req.query.url) {
    let url = new URL(req.query.url);

    let dataset = await DatasetModel.getDataset(req.query.url)

    if (dataset) {
      new Crawler(dataset);
      let resp = `Worker ${process.pid} started to crawl: ${url.href}`;
      console.log(resp);
      res.send(resp);
    } else {
      res.status(404).send(`${url.href} is not in our DB. If you want to add it, try /api/add?url=`);
    }
  } else {
    res.status(404).send('give me an url');
  }
});

module.exports = router;









/*
router.get('/get/:url', async function (req, res, next) {
  if (req.query.url) {
    let url = new URL(req.query.url);

    let dataset = await DatasetModel.findOne({
      url: url
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
      res.status(404).send(`${url.href} is not in our db. If you want to crawl it, try /api/add?url=`);
    }
  } else {
    res.status(404).send('give me an url');
  }
});


router.get('/quit', async function (req, res, next) {
  if (req.query.url) {
    let url = new URL(req.query.url);

    let dataset = await DatasetModel.findOne({
      url: url
    }).exec();

    if (dataset) {
      if (dataset.stopped != true) {
        dataset.stopped = true;
        await dataset.save();
        res.send('Stopped crawling:' + url);
      } else {
        res.status(404).send(`${url.href} is already stopped`);
      }
    } else {
      res.status(404).send(`${url.href} is not in our db. If you want to add it, try /api/add?url=`);
    }
  } else {
    res.status(404).send('give me an url');
  }
});

router.get('/start', async function (req, res, next) {
  if (req.query.url) {
    let url = new URL(req.query.url);

    let dataset = await DatasetModel.findOne({
      url: url
    }).exec();

    if (dataset) {
      if (dataset.stopped == true) {
        dataset.stopped = false;
        await dataset.save();
        res.send('Started crawling:' + url.href);
      } else {
        res.status(404).send(`${url.href} already started`);
      }
    } else {
      res.status(404).send(`${url.href} is not in our db. If you want to add it, try /api/add?url=`);
    }
  } else {
    res.status(404).send('give me an url');
  }
});
*/