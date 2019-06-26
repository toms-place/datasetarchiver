const sleep = require('util').promisify(setTimeout);
const rp = require('request-promise-native');
const {
  host,
  port,
  protocol
} = require('./config');

//db setup
import db from './database.js';
import DatasetModel from './models/dataset.js';

db.connection.on('connected', function () {
  tick(10000);
});

function tick(time) {
  console.log(`Master ticked`);

  DatasetModel.getDatasetsToBeCrawled().then(async (datasets) => {

    for (let dataset of datasets) {
      crawl(dataset);
      await sleep(0.1);
    }

    await sleep(time);
    tick(time);

  }).catch(err => {
    console.error(err)
  })
}

function crawl(dataset) {
  console.log('crawl', dataset.url.href)

  rp.get(`${protocol}//${host}:${port}/api/crawl?url=${dataset.url.href}`, (err, httpResponse, body) => {
    if (err) console.error(err)
    else {
      console.log(body)
    }
  })
}