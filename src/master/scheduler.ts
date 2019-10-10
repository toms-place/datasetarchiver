const sleep = require('util').promisify(setTimeout);
import rp from 'request-promise-native';
import config from '../server/config';
//db setup
import db from '../server/common/database';
import L from '../server/common/logger'
import { ObjectID } from 'mongodb';

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
        this.hostnames = [];

        if (this.querys) {

          for (let query of this.querys) {
            this.hostnames.push(query._id)
          }

          for (let host of this.hostsToCrawl) {
            for (let query of this.querys) {
              if (host.name == query._id) {
                this.promises.push(
                  this.crawl(query.id)
                )
              }
            }
          }

          L.info('Want to Crawl: ' + String(this.querys.length))
          L.info('Able to Crawl: ' + String(this.promises.length))
          await Promise.all(this.promises)
          L.info('Started to crawl: ' + String(this.count))

        }

        //recurse
        await sleep(1000)
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

  async crawl(id: ObjectID) {
    try {
      this.href = `${config.protocol}//${config.host}:${config.CRAWLER_PORT}${config.endpoint}/api/v1/crawlID?id=${id}&secret=${config.pass}`
      this.resp = await rp.post(this.href, {
        rejectUnauthorized: false
      })

      if (JSON.parse(this.resp).crawling != true) {
        //L.info(this.resp)
        return false
      } else {
        this.count += 1
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