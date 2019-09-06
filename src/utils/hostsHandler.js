const db = require('../database').getInstance();
const {
	CRAWL_HostInterval
} = require('../config');

let instance = null;

class HostsHandler {
	constructor(hosts) {
		this._hosts = hosts;
	}
	async checkDataset(dataset) {
		let flag = false;
		if (this.hosts) {
			for (let host of this.hosts) {
				for (let hostDataset of host.datasets) {
					if (String(dataset._id) == String(hostDataset)) {
						flag = true;
						this.hosts = null;
						return true;
					}
				}
			}
		} else {
			return false
		}
		if (flag == false) {
			this.hosts = null;
			return false
		}
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