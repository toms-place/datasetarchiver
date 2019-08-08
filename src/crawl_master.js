const sleep = require('util').promisify(setTimeout);
const rp = require('request');
const {
  host,
  port,
  protocol
} = require('./config');
const {
  getDatasetsToBeCrawled
} = require('./services/dataset');

//db setup
import db from './database.js';

db.connection.on('connected', function () {
  tick(10000);
});

async function tick(time) {
  console.log(`Master ticked`);

  let datasets = await getDatasetsToBeCrawled()

  for (let dataset of datasets) {
    crawl(dataset);
    await sleep(0.1);
  }

  await sleep(time);
  tick(time);

}

function crawl(dataset) {
  console.log('crawl', dataset.url.href)

  rp.get(`${protocol}//${host}:${port}/api/crawl?url=${dataset.url.href}`, (error, httpResponse, body) => {
    if (error) console.error(error)
    else {
      console.log(body)
    }
  })
}