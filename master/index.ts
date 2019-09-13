const sleep = require('util').promisify(setTimeout);
import rp from 'request-promise-native';
import config from '../server/config';
//db setup
import db from '../server/database';
import {
  IDataset
} from '../server/api/models/dataset';
import L from '../server/common/logger'

import hostsHandler from './hostsHandler';
import Crawler from '../server/utils/crawler';
import {
  promises
} from 'dns';

let dbFlag = true;

db.conn.on('connected', () => {
  dbFlag = true;
  tick()
})

db.conn.on('disconnected', () => {
  dbFlag = false;
})

/**
 * make it use less cpu 
 */
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

    let promises: Promise < any > [] = []
    hosts: for (let host of hostsHandler.hosts) {

      for (let dataset of datasets) {

        if (dataset.url.hostname == host.name) {

          promises.push(new Promise(async (resolve, reject) => {
            let resp = await crawl(dataset);

            let crawler = new Crawler(dataset)

            if (resp) {
              crawler.calcNextCrawl(true);
            } else {
              crawler.calcNextCrawl(false)
            }

            if (crawler.dataset.crawl_info.firstCrawl == true) {
              crawler.dataset.crawl_info.firstCrawl = false
            }

            await dataset.save()

            await hostsHandler.releaseHost(dataset.url.hostname)
            resolve()
          }))

          continue hosts;

        }

      }
    }

    await Promise.all(promises)

  }

  await sleep(500)
  tick()
}

async function crawl(dataset: IDataset) {
  try {
    let href: URL['href'];
    //TODO API JSON because of request params
    href = `${config.protocol}//${config.host}:${config.port}${config.endpoint}/api/v1/crawlHrefSync?href=${dataset.url.href}`
    let resp = await rp.get(href, {
      rejectUnauthorized: false
    })
    L.info(resp)
    return resp
  } catch (error) {
    L.error(error)
    return false
  }
}