import {
  CrawlerService,
  addHrefResponse
} from '../services/crawler.service';
import {
  Request,
  Response,
  NextFunction
} from 'express';
import L from '../../../common/logger'
import {
  isArray
} from 'util';
import Archiver from 'archiver';
import fileTypeDetector from '../../../utils/fileTypeDetector'
import config from '../../../config';
var MultiStream = require('multistream')
const {
  Readable
} = require('stream');
import bcrypt from 'bcrypt';




export class Controller {
  async addHref(req: Request, res: Response, next: NextFunction): Promise < void > {
    let match;
    try {
      match = await bcrypt.compare(req.query.secret, config.secret)
    } catch (error) {
      L.error(error)
    }
    if (req.query.href && match) {
      let r: addHrefResponse;
      try {
        r = await CrawlerService.addHref(req.query.href, req.query.source, req.query.filename, req.query.filetype, req.query.extension)
        res.json(r);
      } catch (error) {
        console.log(error)
        next(error)
      }
    } else {
      next(new Error('not found'))
    }
  }
  async addManyHrefs(req: Request, res: Response, next: NextFunction): Promise < void > {
    let match;
    try {
      match = await bcrypt.compare(req.query.secret, config.secret)
    } catch (error) {
      L.error(error)
    }
    if (req.query.hrefs && match) {
      let r: addHrefResponse;
      try {
        let array = JSON.parse(req.query.hrefs)
        if (isArray(array)) {
          r = await CrawlerService.addManyHrefs(array)
        } else {
          let error = new Error('no array');
          next(error)
          return
        }
        res.json(r);
      } catch (error) {

        next(error)
      }
    } else {
      next(new Error('not found'))
    }
  }
  async crawlHref(req: Request, res: Response, next: NextFunction): Promise < void > {
    let match;
    try {
      match = await bcrypt.compare(req.query.secret, config.secret)
    } catch (error) {
      L.error(error)
    }
    if (req.query.href && match) {
      try {
        let r = await CrawlerService.crawlHref(req.query.href)
        L.info(String(r))
        res.json(r);
      } catch (error) {
        next(error)
        return
      }
    } else {
      next(new Error('not found'))
    }
  }
  async crawlID(req: Request, res: Response, next: NextFunction): Promise < void > {
    let match;
    try {
      match = await bcrypt.compare(req.query.secret, config.secret)
    } catch (error) {
      L.error(error)
    }
    if (req.query.id && match) {
      try {
        let r = await CrawlerService.crawlID(req.query.id)
        res.json(r);
      } catch (error) {
        next(error)
        return
      }
    } else {
      next(new Error('not found'))
    }
  }
  async crawlHrefSync(req: Request, res: Response, next: NextFunction): Promise < void > {
    let match;
    try {
      match = await bcrypt.compare(req.query.secret, config.secret)
    } catch (error) {
      L.error(error)
    }
    if (req.query.href && match) {
      try {
        let r = await CrawlerService.crawlHrefSync(req.query.href)
        res.json(r);
      } catch (error) {
        next(error)
        return
      }
    } else {
      next(new Error('not found'))
    }
  }

  async getFiles(req: Request, res: Response, next: NextFunction): Promise < void > {
    //check query
    if (req.query.byType) {
      try {
        let filetype = new fileTypeDetector(req.query.byType)
        if (!filetype.extension) {
          next(new Error('wrong filetype'))
          return
        }
        let versionStreams = await CrawlerService.getAllLastVersionsByFileType(filetype.extension)
        if (versionStreams.length <= 0) {
          next(new Error('no file found'))
          return
        }

        let streams = [];

        switch (req.query.as) {
          case 'zip':
            let zip = Archiver('zip');
            res.type('application/zip')
            res.header('Content-disposition', `attachment; filename=${filetype.extension}.zip`);

            // Send the file to the page output.
            zip.pipe(res);

            for (let i = 0; i < versionStreams.length; i++) {
              // Create zip with all versions
              zip.append(versionStreams[i].stream, {
                name: versionStreams[i].name
              })
              if (i == versionStreams.length - 1) {
                zip.finalize();
              }
            }

            default: //stream
              try {

                for (let i = 0; i < versionStreams.length; i++) {
                  const s = new Readable();
                  s._read = () => {}; // redundant? see update below
                  s.push('FILENAME_START\n');
                  s.push(versionStreams[i].name);
                  s.push('\nFILENAME_END\n');
                  s.push(null);
                  streams.push(s)
                  streams.push(versionStreams[i].stream)
                }
                new MultiStream(streams).pipe(res)
              } catch (error) {
                console.log(error)
              }
              break;
        }
      } catch (error) {
        next(error)
        return
      }
    } else {
      next(new Error('not found'))
      return
    }
  }

  async getFile(req: Request, res: Response, next: NextFunction): Promise < void > {
    //check query
    if (req.query.id) {
      try {

        let file = await CrawlerService.getFile(req.query.id)
        let stream = await CrawlerService.getFileAsStream(file._id)

        switch (req.query.as) {
          case 'zip':
            if (!file.filename) {
              file.filename = file.md5
            }
            let zip = Archiver('zip');
            res.type('application/zip')
            res.header('Content-disposition', `attachment; filename=${file.filename}.zip`);
            zip.pipe(res)
            zip.append(stream, {
              name: file.filename
            })
            zip.finalize()
            break;

          case 'file':
            if (!file.filename) {
              file.filename = file.md5
            }
            res.type('text/csv')
            res.header('Content-disposition', `attachment; filename=${file.filename}.csv`);
            /* TODO
            if (!file.filetype) {
              res.type('text/csv')
            }
            */
            stream.pipe(res)
            break;

          default: //stream
            stream.pipe(res)
            break;
        }

      } catch (error) {
        next(error)
        return
      }
    } else {
      next(new Error('not found'))
      return
    }
  }

  async dumpLastVersions(req: Request, res: Response, next: NextFunction): Promise < void > {
    //check query
    if (req.query.byType) {
      try {
        let filetype = new fileTypeDetector(req.query.byType)
        if (!filetype.extension) {
          return next(new Error('wrong filetype'))
        }

        let versionStreams = await CrawlerService.getAllLastVersionsByFileType(filetype.extension)
        if (versionStreams.length <= 0) {
          next(new Error('no file found'))
          return
        }

        const metaStream = new Readable();
        metaStream._read = () => {}; // redundant? see update below
        let meta;

        let zip = Archiver('zip');
        res.type('application/zip');
        res.header('Content-disposition', `attachment; filename=${filetype.extension}_${new Date().getTime()}.zip`);

        // Send the file to the page output.
        zip.pipe(res);

        for (let i = 0; i < versionStreams.length; i++) {
          // Create zip with all versions
          zip.append(versionStreams[i].stream, {
            name: `${versionStreams[i].id}.${filetype.extension}`
          })

          meta = new Object()
          meta.filename_ref = `${versionStreams[i].id}.${filetype.extension}`
          meta.url = versionStreams[i].url
          meta.dataset_id = versionStreams[i].id
          meta.meta = versionStreams[i].meta

          if (i == versionStreams.length - 1) {
            metaStream.push(JSON.stringify(meta) + ']');
          } else if (i == 0) {
            metaStream.push('[' + JSON.stringify(meta) + ',\n');
          } else {
            metaStream.push(JSON.stringify(meta) + ',\n');
          }

          if (i == versionStreams.length - 1) {
            metaStream.push(null);
            zip.append(metaStream, {
              name: 'meta.json'
            })
            zip.finalize();
          }
        }


      } catch (error) {
        console.log(error)
        next(error)
        return
      }
    } else {
      let array = await CrawlerService.getAllVersionIDs()
      res.json(array);
    }
  }


  async getVersions(req: Request, res: Response, next: NextFunction): Promise < void > {
    //check query
    if (req.query.byType) {
      try {
        let filetype = new fileTypeDetector(req.query.byType)
        if (!filetype.extension) {
          return next(new Error('wrong filetype'))
        }
        let array = await CrawlerService.getAllVersionIDsByFileType(filetype.extension)
        res.json(array);

      } catch (error) {
        next(error)
        return
      }
    } else {
      let array = await CrawlerService.getAllVersionIDs()
      res.json(array);
    }
  }

  async getDatasets(req: Request, res: Response, next: NextFunction): Promise < void > {
    //check query
    if (req.query.byType) {
      try {
        let filetype = new fileTypeDetector(req.query.byType)
        if (!filetype.extension) {
          return next(new Error('wrong filetype'))
        }
        let array = await CrawlerService.getDatasetsByFileType(filetype.extension)
        res.json(array);

      } catch (error) {
        next(error)
        return
      }
    } else {
      let array = await CrawlerService.getDatasets()
      res.json(array);
      return
    }
  }

  async getDataset(req: Request, res: Response, next: NextFunction): Promise < void > {
    //check query
    if (req.query.id) {
      try {
        let ds = await CrawlerService.getDataset(req.query.id)
        res.json(ds);
      } catch (error) {
        next(error)
        return
      }
    } else {
      next(new Error('not found'))
      return
    }
  }
}

export default new Controller();