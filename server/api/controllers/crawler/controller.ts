import {
  CrawlerService,
  addHrefResponse
} from '../../services/crawler.service';
import {
  Request,
  Response
} from 'express';
import L from '../../../common/logger'
import { isArray } from 'util';

export class Controller {
  async addHref(req: Request, res: Response): Promise <void> {
    let r:addHrefResponse;
    try {
      r = await CrawlerService.addHref(req.query.href, req.query.source, req.query.filename, req.query.filetype, req.query.extension)
      res.json(r);
    } catch (error) {
      L.error(error)
      res.status(404).json(error)
    }
  }
  async addManyHrefs(req: Request, res: Response): Promise <void> {
    let r:addHrefResponse;
    try {
      let array = JSON.parse(req.query.hrefs)
      if (isArray(array)) {
        r = await CrawlerService.addManyHrefs(array)
      } else {
        let error = new Error('no array')
        L.error(error)
        res.status(409).json(error)
      }
      res.json(r);
    } catch (error) {
      L.error(error)
      res.status(404).json(error)
    }
  }
  async crawlHref(req: Request, res: Response): Promise <void> {
    //check query
    if (req.query.href) {
      try {
        let r = await CrawlerService.crawlHref(req.query.href)
        L.info(String(r))
        res.json(r);
      } catch (error) {
        L.error(error)
        res.status(404).json(error)
      }
    } else {
      res.status(404).end()
    }
  }
  async crawlHrefSync(req: Request, res: Response): Promise <void> {
    //check query
    if (req.query.href) {
      try {
        let r = await CrawlerService.crawlHrefSync(req.query.href)
        res.json(r);
      } catch (error) {
        L.error(error)
        res.status(404).json(error)
      }
    } else {
      res.status(404).end()
    }
  }
}

export default new Controller();