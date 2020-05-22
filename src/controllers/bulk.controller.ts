import Server from '../index'
import {
	Request,
	Response,
	NextFunction
} from 'express'

export default class Controller {
	static async start(req: Request, res: Response, next: NextFunction) {
		Server.bulkerService.LIMIT = parseInt(String(req.query.LIMIT)) || 10000
		Server.bulkerService.OFFSET = parseInt(String(req.query.OFFSET)) || 0
		Server.bulkerService.update_datasets()
		res.json({
			flag: Server.bulkerService.flag,
			offset: Server.bulkerService.OFFSET,
			limit: Server.bulkerService.LIMIT
		})
	}
	static async status(req: Request, res: Response, next: NextFunction) {
		res.json({
			flag: Server.bulkerService.flag,
			offset: Server.bulkerService.OFFSET,
			limit: Server.bulkerService.LIMIT
		})
	}
	static async stop(req: Request, res: Response, next: NextFunction) {
		Server.bulkerService.flag = false
		res.json({
			flag: Server.bulkerService.flag,
			offset: Server.bulkerService.OFFSET,
			limit: Server.bulkerService.LIMIT
		})
	}
	static async continue(req: Request, res: Response, next: NextFunction) {
		Server.bulkerService.update_datasets()
		res.json({
			flag: Server.bulkerService.flag,
			offset: Server.bulkerService.OFFSET,
			limit: Server.bulkerService.LIMIT
		})
	}
}