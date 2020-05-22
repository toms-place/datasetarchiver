/*
select ?d ?t ?desc ?k
from <https://data.wu.ac.at/portalwatch/ld/1940>

where {
?d a dcat:Dataset .
?d dct:title ?t .
?d dct:description ?desc .
OPTIONAL {?d dcat:keyword ?k .}

} LIMIT 100
*/

import L from '../utils/logger'
import rp from 'request-promise-native'
import {
	IMeta,
	ISource
} from '../models/source'
import SourceService from '../services/source.service'
const sleep = require('util').promisify(setTimeout)
import config from '../config'

const bulker: any = null

type IResource = {
	d: string;
	t: string;
	desc: string;
}

export class Bulker {
	public flag = true;
	public OFFSET = 0;
	private LIMIT = 10000
	private promises:  Promise < ISource []> [] = [];

	async bulk() {

		while (this.flag === true) {
			let data

			L.info('init source bulk', new Date())

			try {
				data = JSON.parse(await rp.get(`https://data.wu.ac.at/sparql/?default-graph-uri=&query=select+%3Fd+%3Ft+%3Fdesc%0D%0Afrom+%3Chttps%3A%2F%2Fdata.wu.ac.at%2Fportalwatch%2Fld%2F2002%3E%0D%0A%0D%0Awhere+%7B%0D%0A%3Fd+a+dcat%3ADataset+.%0D%0A%3Fd+dct%3Atitle+%3Ft+.%0D%0A%3Fd+dct%3Adescription+%3Fdesc+.%0D%0A%7D%0D%0A%0D%0ALIMIT+${this.LIMIT}%0D%0AOFFSET+${this.OFFSET}&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on&run=+Run+Query+`))
			} catch (error) {
				await sleep(config.CRAWL_ticktime)
				continue
			}
			if (!data.results.bindings) {
				this.flag = false
				return false
			} else if (data.results.bindings.length < 1) {
				this.flag = false
				return true
			}

			const objects2update: IResource[] = []

			for (const resource of data.results.bindings) {

				const object2update: IResource = {
					d: undefined,
					t: undefined,
					desc: undefined
				}

				try {
					const url = new URL(resource.d.value)
					//index key length max = 1024 bytes
					if (Buffer.byteLength(url.href, 'utf8') >= 512 || url.href.length >= 512) {
						L.error('url key too large:', url.href)
						continue
					}

					object2update.d = url.href

					if (resource.t) {
						object2update.t = resource.t.value
					}
					if (resource.desc) {
						object2update.desc = resource.desc.value
					}

					objects2update.push(object2update)

				} catch (error) {
					L.error(error.message)
				}

			}

			this.promises.push(this.updateSources(objects2update))

			await sleep(500)

			if (this.promises.length % 10 == 0) {
				L.info('promising')
				L.info(new Date().toUTCString())
				const res = await Promise.all(this.promises)
				let count = 0
				res.forEach((res)=> {
					res.forEach((res)=>{
						if (res) count++
					})
				})
				L.info('inserted: ', count.toString())
				L.info(new Date().toUTCString())
				await sleep(1000)
				this.promises = []
			}

			this.OFFSET += this.LIMIT

		}
		return true

	}

	async updateSources(objects2update: IResource[]): Promise<ISource []> {
		const promises: Promise < ISource > [] = []
		for (const object2update of objects2update) {
			const meta: IMeta = {
				title: object2update.t,
				desc: object2update.desc
			}
			promises.push(SourceService.updateSource(object2update.d, meta))
		}
		return await Promise.all(promises)
	}

	static getInstance() {
		if (bulker === null) return new Bulker()
		else return bulker
	}
}

export default Bulker.getInstance() as Bulker