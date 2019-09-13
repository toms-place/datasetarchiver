const sleep = require('util').promisify(setTimeout);
import rp from 'request-promise-native';
import config from '../server/config';
//db setup
import db from '../server/database';
import {
  IDataset
} from '../server/api/models/dataset';
import L from '../server/common/logger'

//TODO Singleton HOST for crawling management only in master
import hostsHandler from './hostsHandler';

let dbFlag = true;

db.conn.on('connected', () => {
  dbFlag = true;
  tick()
})

db.conn.on('disconnected', () => {
  dbFlag = false;
})

async function tick() {

  let datasets: IDataset[];

  try {
    if (dbFlag) {
      datasets = await db.dataset.find().allToBeCrawled()
      await hostsHandler.initHosts()
    }
  } catch (error) {
    L.error(error)
  }

  if (datasets) {

    hosts: for (let host of hostsHandler.hosts) {

      for (let dataset of datasets) {

        if (dataset.url.hostname == host.name) {
          crawl(dataset);
          await hostsHandler.releaseHost(dataset.url.hostname)
          continue hosts;
        }

      }
    }
  }
  await sleep(500)
  tick()
}

async function crawl(dataset: IDataset) {
  try {
    let href: URL['href'];
    href = `${config.protocol}//${config.host}:${config.port}${config.endpoint}/api/v1/crawlHref?href=${dataset.url.href}`
    let resp = await rp.get(href, {
      rejectUnauthorized: false
    })
    L.info(resp)
  } catch (error) {
    L.error(error)
  }
}