const sleep = require('util').promisify(setTimeout);
const rp = require('request');

//db setup
import db from './database.js';
import DatasetModel from './models/dataset.js';

tick(10000);

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
  console.log('crawl', dataset.url)

  try {
    rp('http://localhost:3000/api/crawl?url=' + dataset.url + '&secret=secret', resp => {
      console.log(resp)
    })
  } catch (error) {
    console.error(error)
  }
}