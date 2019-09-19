import {
  Request,
  Response,
  NextFunction
} from 'express';
import l from '../../../common/logger';

class MyError extends Error {
  message: string;
  statuscode: number;
  shouldRedirect: boolean;
  constructor(message: string, statuscode: number) {
    super()
    this.message = message
    this.statuscode = statuscode
  }
}


export function errorEmitter(req: Request, res: Response, next: NextFunction) {
  let err = new MyError(`${process.pid} Error: ${req.ip} tried to reach ${req.originalUrl}`, 404); // Tells us which IP tried to reach a particular URL
  next(err);
};


// eslint-disable-next-line no-unused-vars, no-shadow
export default function errorHandler(err, req: Request, res: Response, next: NextFunction) {
  l.error(err.message)
  res.status(500).send('Error in api: ' + err.message);

}