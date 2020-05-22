import {
	Request,
	Response
} from 'express'
import config from '../config'

export class Controller {
	slides(req: Request, res: Response): void {
		res.render('slides',{ basePath: config.ENDPOINT})
	}
}

export default new Controller()