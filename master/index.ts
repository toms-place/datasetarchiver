const sleep = require('util').promisify(setTimeout);
import rp from 'request-promise-native';
import config from '../server/config';
//db setup
import db from '../server/common/database';
import L from '../server/common/logger'
import hostsHandler from '../server/utils/hostsHandler';

let dbFlag = true;

db.conn.on('connected', () => {
  dbFlag = true;
  hostsHandler.releaseHosts()
  tick()
})

db.conn.on('disconnected', () => {
  dbFlag = false;
})

/**
 * make it use less cpu 
 */
async function tick() {

  let querys;

  try {
    if (dbFlag) {
      querys = await db.dataset.aggregate(
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
      await hostsHandler.initHosts(querys)
    }
  } catch (error) {
    L.error(error)
  }

  if (querys) {

    let promises: Promise < any > [] = []
    hosts: for (let host of hostsHandler.hosts) {

      for (let query of querys) {

        if (query._id == host.name) {

          promises.push(new Promise(async (resolve, reject) => {
            try {
              await crawl(query.id, host.name);
            } catch (error) {
              L.error(error)
            }
            resolve()
          }))

          continue hosts;

        }

      }
    }

    L.info(String(promises.length))
    await Promise.all(promises)

  }

  await sleep(1000)
  tick()
}

async function crawl(id, hostname) {
  try {
    await hostsHandler.lockHost(hostname)
    let href: URL['href'];
    //TODO API JSON because of request params ? ID
    href = `${config.protocol}//${config.host}:${config.port}${config.endpoint}/api/v1/crawlID?id=${id}`
    let resp = await rp.get(href, {
      rejectUnauthorized: false
    })

    if (resp != 'true') {
      L.info(resp)
    }

    return resp
  } catch (error) {
    L.error(error)
    return false
  }
}