import db from './server/database';

db.conn.on('connected', async () => {
	let datasets = await db.dataset.aggregate(
		[{
			$match: {
				$and: [{
					'crawl_info.nextCrawl': {
						$lt: new Date()
					}
				}, {
					'crawl_info.stopped': false
				}]
			}
		}, {
			$sort: {
				"crawl_info.nextCrawl": -1
			}
		}, {
			$group: {
				_id: '$url.hostname',
				id: {
					'$first': '$id'
				}
			}
		}, {
			$project: {
				hostname: '$_id',
				href: '$id'
			}
		}]).allowDiskUse(true);


	console.log(datasets);
	process.exit()
})