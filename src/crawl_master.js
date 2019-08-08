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
  tick();
});

async function tick() {

  let datasets = await getDatasetsToBeCrawled()

  for (let dataset of datasets) {
    crawl(dataset);
    await sleep(0.5);
  }

  tick();

}

function crawl(dataset) {
  rp.get(`${protocol}//${host}:${port}/api/crawl?url=${dataset.url.href}`, (error, httpResponse, body) => {
    if (error) console.error(error)
    else {
      console.log(body)
    }
  })
}