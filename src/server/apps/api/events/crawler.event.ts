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
	async crawl(id: ObjectId) {
		try {
			console.log(this.count)
				++this.count
			let locking = await db.host.lockHost(id)
			let dataset = await db.dataset.findByIdAndUpdate(id, {
				$set: {
					'crawl_info.currentlyCrawled': true
				}
			}, {
				new: true
			})

			if (!dataset) {
				let released = await db.host.releaseHostByDsID(id)
				l.error(`Dataset not found: ${id}; Host released: ${JSON.stringify(released)}`)
			}

			if (locking.nModified == 1) {
				let crawler = new Crawler(dataset);
				await crawler.crawl()
					--this.count
				return true;
			} else {
				--this.count
				return false
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