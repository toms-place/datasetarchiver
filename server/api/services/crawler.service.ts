import L from '../../common/logger'
import db from '../../database';
import config from '../../config';
import Crawler from '../../utils/crawler';
import FileTypeDetector from '../../utils/fileTypeDetector';
import {
  IDataset
} from '../models/dataset';
import sanitize from "sanitize-filename";

export interface addHrefResponse {
  datasetstatus: Number;
  datasetmessages: string[];
  datasethref: string;
}

export class CrawlerService {
  static async addHref(href: string, source ? : string, filename ? : string, filetype ? : string, extension ? : string): Promise < any > {
    L.info('add Href:', href);
    let url: URL;
    let resp: addHrefResponse = {
      datasetstatus: 200,
      datasetmessages: [],
      datasethref: ''
    };
    let dataset: IDataset = null;

    try {
      url = new URL(href);
      resp.datasethref = url.href
    } catch (error) {
      let err = new Error();
      err.name = 'Parse Error'
      err.message = `cannot parse: ${href}`
      throw error
    }

    try {

      dataset = await db.dataset.findOne({
        id: url.href
      })

      if (dataset) {
        if (source || filename || filetype || extension) {
          if (source) {
            let src = new URL(source)
            if (!dataset.meta.source.some(e => e.host === src.host)) {
              dataset.meta.source.push(src)
              resp.datasetmessages.push('src added to dataset')
            } else {
              resp.datasetstatus = 409
              resp.datasetmessages.push('src already added')
            }
          }

          if (filename) {
            dataset.meta.filename = sanitize(filename)
            resp.datasetmessages.push('filename changed')
          }

          if (filetype || extension) {
            let detector = new FileTypeDetector(filetype, extension)
            dataset.meta.filetype = detector.mimeType
            dataset.meta.extension = detector.extension
            resp.datasetmessages.push('filetype and extension changed')
          }

        } else {
          resp.datasetstatus = 409
          resp.datasetmessages.push('url already added')
        }

      } else {

        //index key length max = 1024 bytes
        if (Buffer.byteLength(url.href, 'utf8') > 1024) {
          let err = new Error();
          err.name = 'Href Error'
          err.message = `href too long: ${href}`
          throw err
        }

        dataset = new db.dataset({
          url: url,
          id: url.href,
          'meta.filename': filename,
          'meta.source': [],
          'crawl_info.crawlInterval': config.CRAWL_minRange,
          'crawl_info.nextCrawl': new Date(new Date().getTime() + config.CRAWL_minRange * 1000)
        });

        if (source) {
          dataset.meta.source.push(new URL(source))
        }

        let detector = new FileTypeDetector(filetype, extension)
        dataset.meta.filetype = detector.mimeType
        dataset.meta.extension = detector.extension

        resp.datasetstatus = 200;
        resp.datasetmessages.push('dataset added');

        await db.host.updateOne({
          name: url.hostname
        }, {
          $push: {
            datasets: dataset._id
          }
        }, {
          upsert: true,
          setDefaultsOnInsert: true
        })

      }

      await dataset.save()

    } catch (error) {
      throw error;
    }

    return resp
  }

  static async crawlHref(href: string): Promise < boolean > {
    let url = new URL(href);

    let dataset = await db.dataset.find().oneToBeCrawled(url)
    if (!dataset) {
      throw new Error(`Dataset not found: ${url.href}`);
    }

    let crawler = new Crawler(dataset);
    crawler.crawl()

    return true;
  }

  static async crawlHrefSync(href: string): Promise < boolean > {
    try {

      let url = new URL(href);
      let dataset = await db.dataset.find().oneToBeCrawled(url)
      if (!dataset) {
        console.log('NO DATASET!!', href)
        return false
      }

      let crawler = new Crawler(dataset);
      let res = await crawler.crawl()
      return res

    } catch (error) {
      throw error;
    }
  }

  static async addManyHrefs(hrefs: Array < URL['href'] > ): Promise < any > {
    let resp = [];
    let batches = batch(hrefs)
    for (let batch of batches) {
      let datasets = []
      for (let href of batch) {
        let url: URL;
        let dataset: IDataset;
        try {
          url = new URL(href)
        } catch (error) {
          continue;
        }

        try {

          let existingDataset = await db.dataset.findOne({
            id: url.href
          })

          if (!existingDataset) {

            //index key length max = 1024 bytes
            if (Buffer.byteLength(url.href, 'utf8') > 1024) {
              continue;
            }

            dataset = new db.dataset({
              url: url,
              id: url.href,
              meta: undefined,
              crawl_info: undefined
            });

            datasets.push(dataset)
          }

        } catch (error) {
          throw error;
        }
      }
      resp.push(await db.dataset.addMany(datasets))
    }
    return resp
  }
}

export default new CrawlerService();




function batch(results) {
  let batches = [];
  let count = 0;
  batches[count] = [];
  for (let i = 1; i < results.length; i++) {
    try {
      batches[count].push(results[i])
      if (i % 10 == 0) {
        count++;
        batches[count] = [];
      }
      if (i == results.length - 1) {
        batches[count].push(results[0])
      }
    } catch (error) {
      L.error(error)
    }
  }

  return batches
}