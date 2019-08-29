const sleep = require('util').promisify(setTimeout);
const rp = require('request-promise-native');
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

  let datasets = await db.host.find().getDatasetsToCrawl();

  if (datasets) {
    for (let dataset of datasets) {
      let res = await crawl(dataset);
      console.log(res)
    }
  }

  await sleep(500)

  tick();

}

async function crawl(dataset) {
  try {
    return rp.get(`${protocol}//${host}:${port}/api/crawl?url=${dataset.url.href}`)
  } catch (error) {
    if (error.name == 'RequestError') {
      console.log('waiting for connection')
      await sleep(10000)
    } else {
      console.error(error.message)
    }
  }
}