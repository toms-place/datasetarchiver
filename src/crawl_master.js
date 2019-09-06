const sleep = require('util').promisify(setTimeout);
const rp = require('request-promise-native');
const hostsHandler = require('./utils/hostsHandler').getInstance();
const {
  host,
  port,
  protocol,
  env,
  endpoint
} = require('./config');

//TODO Singleton HOST for crawling management only in master

//db setup
const db = require('./database.js').getInstance();

//testConnection()

let dbFlag = true;

db.conn.on('connected', () => {
  dbFlag = true;
  tick();
})

db.conn.on('disconnected', () => {
  dbFlag = false;
})

async function tick() {

  let datasets;

  try {
    if (dbFlag) {
      datasets = await db.dataset.find().getDatasetsToCrawl()
      await hostsHandler.initHosts()
    }
  } catch (error) {
    console.log(error)
  }

  if (datasets) {

    hosts: for (let host of hostsHandler.hosts) {

      for (let dataset of datasets) {

        if (dataset.url.hostname == host.name) {
          crawl(dataset);
          hostsHandler.releaseHost(dataset.url.hostname)
          continue hosts;
        }

      }
    }
  }

  await sleep(500)

  tick();

}

async function crawl(dataset) {
  try {
    let url;
    if (env == 'production') {
      url = `${protocol}//${host}:${port}/${endpoint}/api/crawl?url=${dataset.url.href}`
    } else {
      url = `${protocol}//${host}:${port}/api/crawl?url=${dataset.url.href}`
    }
    let resp = await rp.get({
      uri: url,
      insecure: true
    })
    console.log(resp)
  } catch (error) {
    console.error(error.message)
  }
}