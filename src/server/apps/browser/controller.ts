import {
  Request,
  Response
} from 'express';
import config from '../../config';

export class Controller {
  index(req: Request, res: Response): void {
    res.render('index',{ basePath: config.endpoint});
  }
  explorer(req: Request, res: Response): void {
    res.render('api-explorer',{ basePath: config.endpoint});
  }
}

export default new Controller();