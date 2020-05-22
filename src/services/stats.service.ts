import L from '../utils/logger'
import db from '../utils/database'

export default {

	async getBasicStats(): Promise < any > {
		const stats = [db.dataset.countDocuments({}), db.host.countDocuments({}), db.file.countDocuments({}), db.source.countDocuments({})]
		const awaitedStats = await Promise.all(stats)
		const count = {
			datasetCount: awaitedStats[0],
			hostCount: awaitedStats[1],
			fileCount: awaitedStats[2],
			sourceCount: awaitedStats[3]
		}
		return count
	},

	async getFiletypeDistribution(): Promise < any[] > {
		const distr = db.dataset.aggregate([
			{$group: {_id: '$meta.filetype', count: {$sum: 1}}},
			{$sort: {count:-1}}
		])
		return distr
	},

	async getDatasetCountPerHost(limit = 1): Promise < any[] > {
		return db.dataset.aggregate([
			{$match: {'crawl_info.stopped': false}},
			{$group: {
				'_id': '$url.hostname',
				datasets: { $push: '$id'}}
			},
			{$project: {
				hostname: '$_id',
				datasets: {$size: '$datasets'},
				'_id': 0}
			},
			{$sort: {'datasets': -1}},
			{$limit: limit}
		]).allowDiskUse(true)
	}

}