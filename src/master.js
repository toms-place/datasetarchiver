const sleep = require('util').promisify(setTimeout);
const rp = require('request-promise-native');

//db setup
import db from './database.js';
import DatasetModel from './models/dataset.js';

tick(10000);

function tick(time) {

  DatasetModel.getDatasets().then(async (datasets) => {

    for (let dataset of datasets) {
      if (dataset.nextCrawl <= new Date() && dataset.stopped != true) {
        send(dataset);
      }
    }

    console.log(`Master ticked`);
    await sleep(time);
    tick(time);

  }).catch(err => {
    console.error(err)
  })
}

function send(dataset) {
  console.log(dataset.url)
  rp('http://localhost:3000/api/crawl?url=' + dataset.url + '&secret=secret').catch((err) => {
    console.error(err.name)
  })
}