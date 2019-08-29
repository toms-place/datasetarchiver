const sleep = require('util').promisify(setTimeout);
const rp = require('request-promise-native');
const {
  host,
  port,
  protocol
} = require('./config');

//db setup
const db = require('./database.js').getInstance();
const dbEmitter = require('./events/dbEvents');

dbEmitter.on('connected', () => {
  tick();
})

async function tick() {

  let datasets = await db.host.find().getDatasetsToCrawl();

  if (datasets) {
    for (let dataset of datasets) {
      await crawl(dataset);
    }
  }

  await sleep(500)

  tick();

}

async function crawl(dataset) {
  try {
    let resp = await rp.get(`${protocol}//${host}:${port}/api/crawl?url=${dataset.url.href}`)
    console.log(resp)
  } catch (error) {
    if (error.name == 'RequestError') {
      console.log('waiting for connection')
      await sleep(10000)
    } else {
      console.error(error.message)
    }
  }
}