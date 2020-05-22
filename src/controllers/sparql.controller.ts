import bulk from '../bulk_scripts/bulk_fill_sparql'
import {
	SchedulerService
} from '../services/scheduler.service'
import {
	Request,
	Response,
	NextFunction
} from 'express'

export default class Controller {
	static async start(req: Request, res: Response, next: NextFunction) {
		SchedulerService.stop()
		bulk()
		res.send('started')
	}
}