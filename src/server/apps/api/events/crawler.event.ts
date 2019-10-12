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
	async crawl(_id: ObjectId) {
		try {
			++this.count
			let host = await db.host.lockHost(_id)
			let dataset = await db.dataset.lockDataset(_id)

			if (!dataset || !host) {
				await db.host.releaseHostByDsID(_id)
				await db.dataset.releaseDataset(_id)
				l.error(`Dataset or Host not found: ${_id};`);
				--this.count
				return false
			} else {
				let crawler = new Crawler(dataset);
				await crawler.crawl();
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