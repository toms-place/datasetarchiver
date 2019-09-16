const sleep = require('util').promisify(setTimeout);
import rp from 'request-promise-native';
import config from '../server/config';
//db setup
import db from '../server/database';
import L from '../server/common/logger'
import hostsHandler from '../server/utils/hostsHandler';

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

  let datasets;

  try {
    if (dbFlag) {
      datasets = await db.dataset.aggregate(
        [{
          $match: {
            $and: [{
              'crawl_info.nextCrawl': {
                $lt: new Date()
              }
            }, {
              'crawl_info.stopped': false
            }]
          }
        }, {
          $sort: {
            "crawl_info.nextCrawl": -1
          }
        }, {
          $group: {
            _id: '$url.hostname',
            id: {
              '$first': '$_id'
            }
          }
        }]).allowDiskUse(true);
      await hostsHandler.initHosts(datasets)
    }
  } catch (error) {
    L.error(error)
  }

  if (datasets) {

    let promises: Promise < any > [] = []
    hosts: for (let host of hostsHandler.hosts) {

      for (let dataset of datasets) {

        if (dataset._id == host.name) {

          promises.push(new Promise(async (resolve, reject) => {
            try {
              await crawl(dataset.id);
            } catch (error) {
              L.error(error)
            }
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

async function crawl(id) {
  try {
    let href: URL['href'];
    //TODO API JSON because of request params
    href = `${config.protocol}//${config.host}:${config.port}${config.endpoint}/api/v1/crawlID?id=${id}`
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