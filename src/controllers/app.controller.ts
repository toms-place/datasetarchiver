import {
	Request,
	Response,
	NextFunction
} from 'express'
import StatsService from '../services/stats.service'
import config from '../config'

export class Controller {
	index(req: Request, res: Response): void {
		res.render('index', {
			basePath: config.ENDPOINT
		})
	}
	async stats(req: Request, res: Response): Promise < void > {
		res.render('stats', {
			basePath: config.ENDPOINT
		})
	}
	explorer(req: Request, res: Response): void {
		res.render('api-explorer', {
			basePath: config.ENDPOINT
		})
	}

	async getDatasetCountPerHost(req: Request, res: Response, next: NextFunction): Promise < void > {
		try {
			res.json(await StatsService.getDatasetCountPerHost(parseInt(String(req.query.limit))))
		} catch (error) {
			next(error)
		}
	}

	async getBasicStats(req: Request, res: Response, next: NextFunction): Promise < void > {
		try {
			res.json(await StatsService.getBasicStats())
		} catch (error) {
			next(error)
		}
	}

	async getFiletypeDistribution(req: Request, res: Response, next: NextFunction): Promise < void > {
		try {
			res.json(await StatsService.getFiletypeDistribution())
		} catch (error) {
			next(error)
		}
	}

	slides(req: Request, res: Response): void {
		res.render('slides',{ basePath: config.ENDPOINT})
	}

}

export default new Controller()