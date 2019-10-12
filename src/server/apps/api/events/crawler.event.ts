import EventEmitter from 'events';
import Crawler from '../../../utils/crawler'
import db from '../../../common/database'
import l from '../../../common/logger'
import {
	ObjectId
} from 'mongodb';

const crawlEmitter = null;

export class CrawlEmitter extends EventEmitter {
	count: number
	constructor() {
		super()
		this.count = 0
	}
	async crawl(_id: ObjectId) {
		try {
			++this.count
			let host = await db.host.lockHost(_id)
			let dataset = await db.dataset.findOneAndUpdate({
				$and: [{
					_id: _id
				}, {
					'crawl_info.nextCrawl': {
						$lt: new Date()
					}
				}, {
					'crawl_info.currentlyCrawled': false
				}]
			}, {
				$set: {
					'crawl_info.currentlyCrawled': true
				}
			}, {
				new: true
			})

			if (!dataset || !host) {
				let released = await db.host.releaseHostByDsID(_id)
				l.error(`Dataset or Host not found: ${_id}; Host released: ${JSON.stringify(released)}`)
				--this.count
				return false
			} else {
				let crawler = new Crawler(dataset);
				await crawler.crawl()
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