import sourceBulker from '../bulk_scripts/bulk_update_sources'
import {
	Request,
	Response,
	NextFunction
} from 'express'

export default class Controller {
	static async start(req: Request, res: Response, next: NextFunction) {
		sourceBulker.flag = true
		sourceBulker.OFFSET = 0
		sourceBulker.bulk()
		res.send('started')
	}
	static async status(req: Request, res: Response, next: NextFunction) {
		res.json({
			flag: sourceBulker.flag,
			offset: sourceBulker.OFFSET
		})
	}
	static async stop(req: Request, res: Response, next: NextFunction) {
		sourceBulker.flag = false
		res.json({
			flag: sourceBulker.flag,
			offset: sourceBulker.OFFSET
		})
	}
	static async continue(req: Request, res: Response, next: NextFunction) {
		sourceBulker.flag = true
		sourceBulker.bulk()
		res.json({
			flag: sourceBulker.flag,
			offset: sourceBulker.OFFSET
		})
	}
}