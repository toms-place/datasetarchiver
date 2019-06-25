const sleep = require('util').promisify(setTimeout);
const rp = require('request-promise-native');

//db setup
import db from './database.js';
import DatasetModel from './models/dataset.js';

tick(10000);

function tick(time) {
  console.log(`Master ticked`);

  DatasetModel.getDatasetsToBeCrawled().then(async (datasets) => {

    for (let dataset of datasets) {
      crawl(dataset);
    }

    await sleep(time);
    tick(time);

  }).catch(err => {
    console.error(err)
  })
}

function crawl(dataset) {
  console.log('crawl', dataset.url)
  rp('http://localhost:3000/api/crawl?url=' + dataset.url + '&secret=secret').then((resp) => {
    console.log(resp)
  }).catch((err) => {
    console.error(err.name)
  })
}