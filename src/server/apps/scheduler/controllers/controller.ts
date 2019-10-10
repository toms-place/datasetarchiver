import {
  SchedulerService} from '../services/scheduler.service';
import {
  Request,
  Response,
  NextFunction
} from 'express';

export class Controller {
  async stop(req: Request, res: Response, next: NextFunction): Promise < void > {
    res.send(await SchedulerService.stop())
  }
  async start(req: Request, res: Response, next: NextFunction): Promise < void > {
    res.send(await SchedulerService.start())
  }
}

export default new Controller();