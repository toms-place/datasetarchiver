import L from '../../../common/logger'
import db from '../../../common/database';
import config from '../../../config';
import Crawler from '../../../utils/crawler';
import FileTypeDetector from '../../../utils/fileTypeDetector';
import {
  IDataset
} from '../models/dataset';
import sanitize from "sanitize-filename";
import {ObjectId} from "bson";

export interface addHrefResponse {
  datasetstatus: Number;
  datasetmessages: string[];
  datasethref: string;
}

export class CrawlerService {
  static async addHref(href: string, source ? : string, filename ? : string, filetype ? : string, extension ? : string): Promise < any > {
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

  static async crawlID(id: string): Promise < boolean > {

    let dataset = await db.dataset.findOne({
      _id: id
    })
    if (!dataset) {
      throw new Error(`Dataset not found: ${id}`);
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
      return await crawler.crawl()

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

  static async getAllVersionsOfDatasetAsStream(href) {
    try {
      let url = new URL(href);
      let dataset = await db.dataset.findOne({
        url: url
      })
      let versions = []
      for (let version of dataset.versions) {
        let downloadStream = db.bucket.openDownloadStream(version)
        versions.push(downloadStream)
      }
      return versions
    } catch (error) {
      throw error
    }

  }

  static async getAllLastVersionsByFileType(extension) {
    try {
      let datasets = await db.dataset.find({
        $and: [{
            $or: [{
              'meta.filetype': extension
            }, {
              'meta.extension': extension
            }]
          },
          {
            'meta.versionCount': {
              $gt: 0
            }
          }
        ]
      })

      let versionStreams = []
      for (let dataset of datasets) {
        let downloadStream = db.bucket.openDownloadStream(dataset.versions[dataset.versions.length - 1])
        if (!dataset.meta.filename) {
          dataset.meta.filename = 'unknown'
        }
        versionStreams.push({
          stream: downloadStream,
          id: String(dataset._id),
          url: String(dataset.id),
          meta: dataset.meta
        })
      }
      return versionStreams
    } catch (error) {
      throw error
    }

  }

  static async getAllVersionIDsByFileType(extension) {
    try {
      let array = await db.dataset.aggregate([{
        $match: {
          $and: [{
              $or: [{
                'meta.filetype': extension
              }, {
                'meta.extension': extension
              }]
            },
            {
              'meta.versionCount': {
                $gt: 0
              }
            }
          ]
        }
      }, {
        $project: {
          file_ids: '$versions',
          dataset_id: '$_id',
          meta: '$meta',
          _id: 0
        }
      }])
      return array
    } catch (error) {
      throw error
    }

  }


  static async getAllVersionIDs() {
    try {
      let array = await db.dataset.aggregate([{
        $match: {
          'meta.versionCount': {
            $gt: 0
          }
        }
      }, {
        $project: {
          file_ids: '$versions',
          dataset_id: '$_id',
          meta: '$meta',
          _id: 0
        }
      }])
      return array
    } catch (error) {
      throw error
    }

  }


  static async getDataset(id) {
    try {
      let file = await db.dataset.findOne({
        _id: new ObjectId(id)
      })
      return file
    } catch (error) {
      throw error
    }
  }


  static async getDatasetsByFileType(extension): Promise < IDataset[] > {
    try {
      let array = await db.dataset.find({
        $or: [{
          'meta.filetype': extension
        }, {
          'meta.extension': extension
        }]
      })
      return array
    } catch (error) {
      throw error
    }

  }

  static async getDatasets(): Promise < IDataset[] > {
    try {
      let array = await db.dataset.find({})
      return array
    } catch (error) {
      throw error
    }

  }




  static async getFile(id) {
    try {
      let file = await db.file.findOne({
        _id: new ObjectId(id)
      })
      return file
    } catch (error) {
      throw error
    }
  }


  static async getFileAsStream(id) {
    try {
      let downloadStream = db.bucket.openDownloadStream(id)
      return downloadStream
    } catch (error) {
      throw error
    }
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