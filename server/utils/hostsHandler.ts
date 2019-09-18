import db from '../common/database';
import config from '../config';
import {
	IHost
} from '../apps/api/models/host';

let instance = null;

class HostsHandler {
	_hosts: IHost[]
	_host: IHost

	constructor() {
		this._hosts;
		this._host;
	}

	async initHosts(datasets) {
		let hostnames = [];
		for (let dataset of datasets) {
			hostnames.push(dataset._id)
		}
		this._hosts = await db.host.find({
			'name': {
				$in: hostnames
			}
		})
	}

	async initHost(hostname) {
		this._hosts = await db.host.find({
			'name': hostname
		})
	}

	get hosts() {
		return this._hosts
	}

	get host() {
		return this._host
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