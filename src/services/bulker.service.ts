/*
	SELECT ?url ?format ?dataset ?portal
	FROM <https://data.wu.ac.at/portalwatch/ld/2002>
	WHERE {{
		?portal dcat:dataset ?dataset. ?dataset dcat:distribution ?dist. ?dist dcat:accessURL ?url. ?dist dct:format ?format . }
		UNION {
			?portal dcat:dataset ?dataset. ?dataset dcat:distribution ?dist. ?dist dcat:accessURL ?url. ?dist dct:format ?b . ?b rdfs:label ?format . }
	}
	LIMIT 100
	OFFSET 0

	NEW:

	SELECT ?url ?format ?dataset ?portal ?title
	FROM <https://data.wu.ac.at/portalwatch/ld/2002>
	WHERE {
		?portal dcat:dataset ?dataset .
		?dataset dct:title ?title .
		?dataset dcat:distribution ?dist .
		?dist dcat:accessURL ?url .
		?dist dct:format ?format .
	}
	LIMIT 10
	OFFSET 0
	*/

import L from '../utils/logger'
import {
	CrawlerService,
	IResource as ICrawlerResource
} from './crawler.service'
import rp from 'request-promise-native'
import cf from '../config'
import db from '../utils/database'
import {promisify} from 'util'
const sleep = promisify(setTimeout)

class BulkerService {
	private ioServer: SocketIO.Server;
	public LIMIT: number;
	public OFFSET: number;
	public flag: boolean;
	private bulkDayFlag: boolean;
	public data: any[];
	public bulkCounter = 0;
	public sendFlag: boolean;
	private snapshot: string;

	constructor(ioServer? : SocketIO.Server) {
		this.bulkDayFlag = true
		this.ioServer = ioServer
		this.LIMIT = cf.batchAmount
		this.OFFSET = 0
	}

	async checkForBulkUpdateDay() {
		//every day is bulk day ^^
		const today = new Date().getDate()
		if (today == cf.BULKDAY && this.bulkDayFlag == true) {
			await this.update_datasets()
			L.info(await db.dataset.releaseDatasets())
			L.info(await db.host.releaseHosts())
			this.bulkDayFlag = false
		}
		if (today != cf.BULKDAY) this.bulkDayFlag = true
	}

	async update_datasets() {
		L.info('init update_datasets ' + new Date())
		this.flag = true

		this.snapshot = JSON.parse(
			await rp.get(`https://data.wu.ac.at/sparql/?format=json&query=
				SELECT MAX(?s) AS ?snapshot WHERE { ?a odpw:snapshot ?s }
			`)).results.bindings[0].snapshot.value
		
		await this.get_new_datasets()
		while (this.flag) {
			console.log('is anyone free?')
			this.ioServer.emit('anyOneReadyToBulk')
			await sleep(cf.BULK_INTERVAL)
		}
		L.info('update_datasets ended' + new Date())
	}

	async get_new_datasets() {
		try {
			
			const data = JSON.parse(
				await rp.get(`https://data.wu.ac.at/sparql/?format=json&query=
					SELECT ?url ?format ?dataset ?portal ?title
					FROM <${cf.SPARQLGRAPH}${this.snapshot}>
					WHERE {
						?portal dcat:dataset ?dataset .
						?dataset dct:title ?title .
						?dataset dcat:distribution ?dist .
						?dist dcat:accessURL ?url .
						?dist dct:format ?format .
					}
					LIMIT ${this.LIMIT}
					OFFSET ${this.OFFSET}
				`))
			if (!data.results.bindings) {
				this.flag = false
				return false
			} else if (data.results.bindings.length < 1) {
				this.flag = false
				return true
			}

			this.data = data.results.bindings.flat(3)
			if (!this.ioServer.clients().connected) await this.bulk(this.data)

		} catch (error) {
			L.error(error)
		}
	}

	async bulk(data: any[]) {

		this.bulkCounter++
		L.info('init dataset bulk ' + new Date())
		try {
			const crawlerResources: ICrawlerResource[] = []

			for (const resource of data) {
				try {
					const crawlerResource: ICrawlerResource = {
						href: undefined,
						source: undefined,
						format: undefined,
						title: undefined,
						portal: undefined
					}

					const url = new URL(resource.url.value)
					//index key length max = 1024 bytes
					if (Buffer.byteLength(url.href, 'utf8') >= 512 || url.href.length >= 512) {
						console.error('url key too large:', url.href)
						continue
					}

					crawlerResource.href = url.href
					if (resource.format) crawlerResource.format = resource.format.value
					if (resource.portal) crawlerResource.portal = resource.portal.value
					if (resource.title) crawlerResource.title = resource.title.value
					if (resource.dataset) crawlerResource.source = resource.dataset.value
					crawlerResources.push(crawlerResource)

				} catch (error) {
					L.error(error.message)
					continue
				}

			}

			let res = null
			if (crawlerResources.length > 0) res = await CrawlerService.addResources(crawlerResources)
			this.bulkCounter--
			return res

		} catch (error) {
			L.error(error)
		}
	}

}

export default BulkerService