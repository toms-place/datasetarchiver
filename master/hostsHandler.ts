import db from '../server/database';
import config from '../server/config';
import {
	IHost
} from '../server/api/models/host';

let instance = null;

class HostsHandler {
	_hosts: IHost[]

	constructor() {
		this._hosts;
	}

	async initHosts(datasets) {
		let hostnames = [];
		for (let dataset of datasets) {
			hostnames.push(dataset.hostname)
		}
		this._hosts = await db.host.find({
			'name': {
				$in: hostnames
			}
		})
	}

	get hosts() {
		return this._hosts
	}

	static getInstance(): HostsHandler {
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
				nextCrawl: new Date(new Date().getTime() + config.CRAWL_HostInterval * 1000)
			}
		});

		if (res.nModified > 0 && res.n > 0) {
			return true
		} else {
			return false
		}

	}
}

export default HostsHandler.getInstance();