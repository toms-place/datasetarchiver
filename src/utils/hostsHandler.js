const db = require('../database').getInstance();
const {
	CRAWL_HostInterval
} = require('../config');

let instance = null;

class HostsHandler {
	constructor() {
		this._hosts;
	}

	async initHosts() {
		this._hosts = await db.host.find().getHostsToCrawl()
	}

	get hosts() {
		return this._hosts
	}

	static getInstance() {
		if (!instance) {
			instance = new HostsHandler()
		}
		return instance;
	}

	async releaseHost(hostname) {

		let res = await db.host.updateOne({
			name: hostname
		}, {
			$set: {
				nextCrawl: new Date(new Date().getTime() + CRAWL_HostInterval * 1000)
			}
		});

		if (res.nModified > 0 & res.n > 0) {
			return true
		} else {
			return false
		}

	}
}

module.exports = HostsHandler;