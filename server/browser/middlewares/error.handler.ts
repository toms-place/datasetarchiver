import {
  Request,
  Response,
  NextFunction
} from 'express';
import l from '../../common/logger';

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
  let err = new MyError(`${req.ip} tried to reach ${req.originalUrl}`, 404); // Tells us which IP tried to reach a particular URL
  err.shouldRedirect = true; //New property on err so that our middleware will redirect
  next(err);
};


// eslint-disable-next-line no-unused-vars, no-shadow
export default function errorHandler(err, req: Request, res: Response, next: NextFunction) {
  l.error(err.message)
  if (!err.statuscode) err.statuscode = 500; // Sets a generic server error status code if none is part of the err

  if (err.shouldRedirect) {
    res.locals.error = err
    res.render('error') // Renders a myErrorPage.html for the user
  } else {
    res.status(err.statuscode).send(err.message); // If shouldRedirect is not defined in our error, sends our original err data
  }


}