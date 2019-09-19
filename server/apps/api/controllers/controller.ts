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


export class Controller {
  async addHref(req: Request, res: Response, next: NextFunction): Promise < void > {
    let r: addHrefResponse;
    try {
      r = await CrawlerService.addHref(req.query.href, req.query.source, req.query.filename, req.query.filetype, req.query.extension)
      res.json(r);
    } catch (error) {
      next(error)
    }
  }
  async addManyHrefs(req: Request, res: Response, next: NextFunction): Promise < void > {
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
  }
  async crawlHref(req: Request, res: Response, next: NextFunction): Promise < void > {
    //check query
    if (req.query.href) {
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
    //check query
    if (req.query.id) {
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
    //check query
    if (req.query.href) {
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
  async getAll(req: Request, res: Response, next: NextFunction): Promise < void > {
    //check query
    if (req.query.byFiletype) {
      try {
        let filetype = new fileTypeDetector(req.query.byFiletype)
        if (!filetype.extension) {
          next(new Error('wrong filetype'))
          return
        }
        let versionStreams = await CrawlerService.getAllLastVersionsByFileType(filetype.extension)
        if (versionStreams.length <= 0) {
          next(new Error('no file found'))
          return
        }
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
      } catch (error) {
        next(error)
        return
      }
    } else {
      next(new Error('not found'))
    }
  }
}

export default new Controller();