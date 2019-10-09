const sleep = require('util').promisify(setTimeout);
import rp from 'request-promise-native';
import config from '../server/config';
//db setup
import db from '../server/common/database';
import L from '../server/common/logger'

let dbFlag = true;
let querys;
let count = 0;
let href: URL['href'];
let resp;

db.conn.on('connected', async () => {
  dbFlag = true;
  console.log(await db.host.releaseHosts())
  tick()
})

db.conn.on('disconnected', () => {
  dbFlag = false;
})

/**
 * make it use less cpu 
 */
async function tick() {

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
            "crawl_info.nextCrawl": 1
          }
        }, {
          $group: {
            _id: '$url.hostname',
            id: {
              '$first': '$_id'
            }
          }
        }]).allowDiskUse(true);
    }
  } catch (error) {
    L.error(error)
  }

  if (querys) {

    let promises: Promise < any > [] = []

      for (let query of querys) {

          promises.push(new Promise(async (resolve, reject) => {
            try {
              let host = await db.host.find().getHostToCrawl(query._id)
              if (host) {
                count++;
                await crawl(query.id);
              }
            } catch (error) {
              L.error(error)
            }
            resolve()
          }))

    }

    L.info('Try: ' + String(promises.length))
    await Promise.all(promises)
    L.info('Crawling: ' + String(count))
    count = 0;

  }

  await sleep(1000)
  tick()
}

async function crawl(id) {
  try {
    href = `${config.protocol}//${config.host}:${config.port}${config.endpoint}/api/v1/crawlID?id=${id}&secret=${config.pass}`
    resp = await rp.post(href, {
      rejectUnauthorized: false
    })

    if (JSON.parse(resp).crawling != true) {
      L.info(resp)
    }

    return resp
  } catch (error) {
    L.error(error)
    return false
  }
}