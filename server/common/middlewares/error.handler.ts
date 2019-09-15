import { Request, Response, NextFunction } from 'express';


// eslint-disable-next-line no-unused-vars, no-shadow
export default function errorHandler(err, req: Request, res: Response, next: NextFunction) {

	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
	res.status(err.status || 500);
  res.render('error');

  /*
  const errors = err.errors || [{ message: err.message }];
  res.status(err.status || 500).json({ errors })
  */

}

