const sleep = require('util').promisify(setTimeout);
const rp = require('request');
const {
  host,
  port,
  protocol
} = require('./config');

//db setup
const db = require('./database.js').getInstance();

db.connect().then(() => {
  tick();
});

async function tick() {
  console.log('master ticked')

  let datasets = await db.host.find().getDatasetsToCrawl();

  if (datasets) {
    for (let dataset of datasets) {
      try {
        crawl(dataset);
      } catch (error) {
        console.error(error)
      }
      await sleep(1000);
    }
  } else await sleep(5000);

  await sleep(5000);
  tick();

}

async function crawl(dataset) {
  rp.get(`${protocol}//${host}:${port}/api/crawl?url=${dataset.url.href}`, (error, httpResponse, body) => {
    if (error) console.error(error)
    else {
      console.log(body)
    }
  })
}