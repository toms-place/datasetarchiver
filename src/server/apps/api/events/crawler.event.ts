import Crawler from '../../../utils/crawler'
import db from '../../../common/database'
import l from '../../../common/logger'
import {
	ObjectId
} from 'mongodb';

const crawlEmitter = null;

export class CrawlEmitter {
	count: number
	constructor() {
		this.count = 0
	}
	async crawl(_id: ObjectId, hostname: String) {
		try {
			++this.count
			let host = await db.host.lockHost(hostname)
			let dataset = await db.dataset.lockDataset(_id)

			if (!dataset || !host) {
				await db.dataset.releaseDataset(_id)
				await db.host.releaseHost(hostname)
				l.error(`Dataset or Host not found: ${_id} - NoDS: ${!dataset}, NoHost: ${!host}`);
				--this.count
				return false
			} else {
				let crawler = new Crawler(dataset);
				crawler.crawl();
				--this.count
				return true;
			}

		} catch (error) {
			--this.count
			throw error
		}
	}

	static getInstance() {
		if (!crawlEmitter) {
			let newEmitter = new CrawlEmitter()
			return newEmitter
		} else {
			return crawlEmitter
		}
	}
}

export default CrawlEmitter.getInstance()