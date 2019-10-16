import L from '../../../common/logger'
import db from '../../../common/database';
import config from '../../../config';
import crawlEmitter, {
  CrawlEmitter
} from '../events/crawler.event';
import fileTypeDetector from '../../../utils/fileTypeDetector';
import {
  IDataset
} from '../models/dataset';
import {
  ObjectId
} from "mongodb"
import { Mongoose } from 'mongoose';

export interface IResource {
  href: URL['href'];
  source: URL['href'];
  format: string;
};

export interface addHrefResponse {
  datasetstatus: Number;
  datasetmessages: string[];
  datasethref: string;
}

export class CrawlerService {

  static async crawlID(id: ObjectId): Promise < boolean > {
    try {

      if (crawlEmitter.count < config.CRAWL_asyncCount) {
        crawlEmitter.crawl(id);
        return true
      } else {
        return false
      }

    } catch (error) {
      throw error
    }

  }

  static async addResources(resources: IResource[]): Promise < number > {
    let datasets: IDataset[] = [];
    let dataset: IDataset;
    let url: URL;
    let src: URL;
    let source: any;

    for (let resource of resources) {

      try {
        url = new URL(resource.href)
        //index key length max = 1024 bytes
        if (Buffer.byteLength(url.href, 'utf8') >= 1024 || url.href.length >= 1024) {
          continue;
        }
      } catch (error) {
        continue;
      }

      try {
        let src = new URL(resource.source)
        source = {
          href: src.href,
          origin: src.origin,
          protocol: src.protocol,
          username: src.username,
          password: src.password,
          host: src.host,
          hostname: src.hostname,
          port: src.port,
          pathname: src.pathname,
          search: src.search,
          searchParams: JSON.parse(JSON.stringify((src.searchParams))),
          hash: src.hash
        }

        //index key length max = 1024 bytes
        if (Buffer.byteLength(source.href, 'utf8') >= 1024 || source.href.length >= 1024) source = undefined
      } catch (error) {
        source = undefined
      }

      try {

        dataset = new db.dataset({
          url: url,
          id: url.href,
          meta: undefined,
          crawl_info: undefined
        });

        let detector = new fileTypeDetector(resource.format)
        dataset.meta.filetype = detector.mimeType
        dataset.meta.extension = detector.extension

        if (source) {
          dataset.meta.source.push(source)
        }

        datasets.push(dataset)

      } catch (error) {
        throw error;
      }
    }

    return db.dataset.addMany(datasets)

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
          dataset_url: '$id',
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

  static async getDatasetByUrl(url: URL['href']): Promise < IDataset > {
    try {
      let ds = await db.dataset.findOne({
        id: url
      })
      return ds
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




async function batch(results) {
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