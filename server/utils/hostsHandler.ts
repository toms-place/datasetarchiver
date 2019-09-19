import db from '../common/database';
import config from '../config';
import {
	IHost
} from '../apps/api/models/host';

let instance = null;

class HostsHandler {
	_hosts: IHost[]
	_host: IHost
	hostnames: Array < IHost['name'] > ;

	constructor() {
		this._hosts;
		this._host;
		this.hostnames;
	}

	async initHosts(querys) {
		this.hostnames = [];
		for (let query of querys) {
			this.hostnames.push(query._id)
		}
		this._hosts = await db.host.find({
			$and: [{
				name: {
					$in: this.hostnames
				}
			}, {
				nextCrawl: {
					$lt: new Date()
				}
			}, {
				currentlyCrawled: false
			}]
		})
	}

	async initHost(hostname) {
		this._host = await db.host.findOne({
			'name': hostname
		})
	}

	async lockHosts() {
		await db.host.updateMany({
			name: {
				$in: this.hostnames
			}
		}, {
			$set: {
				currentlyCrawled: true
			}
		})
	}

	async lockHost(hostname) {
		await db.host.updateOne({
			name: hostname
		}, {
			$set: {
				currentlyCrawled: true
			}
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

		try {

			let res = await db.host.updateOne({
				name: hostname
			}, {
				$set: {
					currentlyCrawled: false,
					nextCrawl: new Date(new Date().getTime() + config.CRAWL_HostInterval * 1000)
				}
			});

			if (res.nModified > 0 && res.n > 0) {
				return true
			} else {

				return false
			}

		} catch (error) {
			console.error(error)
		}

	}

	async releaseHosts() {

		try {
			let res = await db.host.updateMany({}, {
				$set: {
					currentlyCrawled: false,
					nextCrawl: new Date(new Date().getTime() + config.CRAWL_HostInterval * 1000)
				}
			});

			if (res.nModified > 0 && res.n > 0) {
				return true
			} else {
				return false
			}

		} catch (error) {
			console.error(error)
		}

	}
}

export default HostsHandler.getInstance();