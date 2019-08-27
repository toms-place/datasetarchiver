const express = require('express');
const router = express.Router();
import {
  addHrefToDB,
  deleteFromDB,
  crawlHref,
  getDatasets
} from '../services/dataset'

router.get('/', function (req, res, next) {
  res.send('See docs for api');
});

router.get('/add', async function (req, res, next) {
  let source;
  let filename;
  if (req.query.url) {
    try {
      if (req.query.source) source = req.query.source;
      if (req.query.filename) filename = req.query.filename;
      let response = await addHrefToDB(req.query.url, source, filename);
      res.json({
        success: response
      });
    } catch (error) {
      next(error);
    }
  } else {
    res.status(401).json({
      error: 'give me an url'
    });
  }
});

router.get('/crawl', async function (req, res, next) {
  if (req.query.url) {
    try {
      let response = await crawlHref(req.query.url)
      if (response == true) {
        res.json({
          success: `Worker ${process.pid} started to crawl: ${req.query.url}`
        });
      } else {
        res.status(423).json({
          error: `Worker ${process.pid} cannot crawl: ${req.query.url}`
        });
      }
    } catch (error) {
      next(error)
    }
  } else {
    res.status(401).json({
      error: 'give me an url'
    });
  }
});

router.get('/delete', async function (req, res, next) {
  if (req.query.url) {
    try {
      let response = await deleteFromDB(req.query.url)
      res.json({
        success: response
      });
    } catch (error) {
      next(error)
    }
  } else {
    res.status(401).json({
      error: 'give me an url'
    });
  }
});

router.get('/get', async function (req, res, next) {
  if (req.query) {
    try {
      let datasets = await getDatasets()
      res.json({
        datasets: datasets
      });
    } catch (error) {
      next(error)
    }
  } else {
    res.status(401).json({
      error: 'give me an url'
    });
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