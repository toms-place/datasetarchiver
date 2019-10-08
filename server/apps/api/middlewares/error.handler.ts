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
  let err = new MyError(`\nPID ${process.pid}\nError: You (${req.ip}) tried to reach ${req.originalUrl}.\nThis route is not yet supported..`, 404); // Tells us which IP tried to reach a particular URL
  next(err);
};


// eslint-disable-next-line no-unused-vars, no-shadow
export default function errorHandler(err, req: Request, res: Response, next: NextFunction) {
  l.error(err)
  res.status(500).send('Error in api: ' + err.message);

}