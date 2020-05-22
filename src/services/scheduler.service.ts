import Server from '../index'
import cf from '../config'
import db from '../utils/database'
import L from '../utils/logger'

export class SchedulerService {
	static stop(): boolean {
		Server.flag = false
		return true
	}

	static async start(): Promise < any > {
		L.info(await db.dataset.releaseDatasets())
		L.info(await db.host.releaseHosts())
		Server.flag = true
		Server.crawl()
		return true
	}

	static async clear(): Promise < any > {
		L.info(await db.dataset.releaseDatasets())
		L.info(await db.host.releaseHosts())  
		return true
	}
}

export default new SchedulerService()