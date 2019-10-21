const sleep = require('util').promisify(setTimeout);
import rp from 'request-promise-native';
import config from '../server/config';
//db setup
import db from '../server/common/database';
import L from '../server/common/logger'
import {
  ObjectID
} from 'mongodb';

let instance = null;

export class Scheduler {
  dbFlag: boolean;
  querys: any;
  href: URL['href'];
  resp: any;
  hostsToCrawl: any;
  promises: Array < Promise < any >> ;
  hostnames: Array < String > ;
  count: number

  constructor() {
    this.dbFlag = true;
    this.promises = [];
    this.hostnames = [];
    this.count = 0;
  }

  async tick() {

    try {
      if (this.dbFlag) {
        this.count = 0;
        this.hostsToCrawl = await db.host.find().getHostsToCrawl()
        this.querys = await db.dataset.getDatasetIDsAndHostNamesToBeCrawledOneByHost()
        this.promises = [];

        if (this.querys) {

          host:
          for (let host of this.hostsToCrawl) {
            for (let query of this.querys) {
              if (host.name == query._id) {
                this.promises.push(
                  this.crawl(query.id, query._id)
                )
                continue host;
              }
            }
          }

          L.info(String(this.promises.length), 'Hosts')
          L.info(String(this.querys.length), 'Datasets')
          await Promise.all(this.promises).catch((error) => {
            console.log('promise', error)
          })
          L.info(String(this.count), 'Started')
          L.info('---')

        }

        //recurse
        await sleep(config.CRAWL_ticktime)
        await this.tick()

      } else {
        console.log('cannot tick')
        return
      }
    } catch (error) {
      this.dbFlag = false
      L.error(error)
      return
    }
  }

  async clear() {
    try {
      this.dbFlag = true;
      console.log(await db.dataset.releaseDatasets())
      console.log(await db.host.releaseHosts())
      return true
    } catch (error) {
      L.error(error)
      return false
    }
  }

  async crawl(id: ObjectID, hostname) {
    try {
      this.href = `${config.CRAWL_API}/crawlID?id=${id}&hostname=${hostname}&secret=${config.pass}`
      this.resp = await rp.post(this.href, {
        rejectUnauthorized: false
      })

      if (JSON.parse(this.resp).crawling != true) {
        //L.info(this.resp)
        return false
      } else {
        ++this.count
        return true
      }

    } catch (error) {
      L.error(error)
      return false
    }
  }

  static getInstance(): Scheduler {
    if (!instance) {
      instance = new Scheduler()
    }
    return instance;
  }
}

export default Scheduler.getInstance()