import L from './utils/logger'
import express, {
	Express
} from 'express'
import socketio from 'socket.io'
import router from './router'
import {
	Server as HttpServer
} from 'http'
import io from 'socket.io-client'
import helmet from 'helmet'
import cors from 'cors'
import cf from './config'
import db, {
	Database
} from './utils/database'
import path from 'path'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import favicon from 'serve-favicon'
import {
	absolutePath as getSwaggerAbsolutePath
} from 'swagger-ui-dist'
import {
	CrawlerService
} from './services/crawler.service'
import errorHandler from './middlewares/error.handler'
import BulkerService from './services/bulker.service'
import {
	promisify
} from 'util'
import {
	Request
} from 'express'
const sleep = promisify(setTimeout)

/** TODO
 * 
 * security and passport.js
 * 
 */
class Server {
private app: Express;
private server: HttpServer;
private ioServer: SocketIO.Server;
private ioClient: SocketIOClient.Socket;
private db: Database = db;
public datasetsToCrawl: any[];
public bulkerService: BulkerService;
public crawlerService: CrawlerService;
public flag = true;
public getUrlsFlag = true;

constructor() {
	this.datasetsToCrawl = []
	this.setup_app()
	this.server_listen()
}

setup_app() {
	this.app = express()
	this.app.use(helmet())
	this.app.disable('x-powered-by')
	const allowedOrigins = ['https://archiver.ai.wu.ac.at', 'http://localhost:3000']
	this.app.use(cors({
		origin: function(origin, callback){
			// allow requests with no origin 
			// (like mobile apps or curl requests)
			if(!origin) return callback(null, true)
			if(allowedOrigins.indexOf(origin) === -1){
				const msg = 'The CORS policy for this site does not ' +
					'allow access from the specified Origin.'
				return callback(new Error(msg), false)
			}
			return callback(null, true)
		}
	}))
	//proxy setup
	this.app.set('trust proxy', 'loopback')
	//logger setup
	this.app.use(morgan('combined', {
		stream: require('file-stream-rotator').getStream({
			filename: path.resolve('./access_%DATE%.log'),
			frequency: 'daily',
			verbose: false,
			date_format: 'YYYYMMDD'
		})
	}))

	//body parser
	this.app.use(bodyParser.json({
		limit: process.env.REQUEST_LIMIT || '100kb' 
	}))
	this.app.use(bodyParser.urlencoded({
		limit: process.env.REQUEST_LIMIT || '100kb',
		extended: true
	}))

	//view engine setup
	this.app.set('view engine', 'pug')
	this.app.set('views', path.resolve('./templates'))

	//cookie parser
	this.app.use(cookieParser(process.env.SESSION_SECRET))

	//favicon
	this.app.use(favicon(path.join(getSwaggerAbsolutePath(), 'favicon-32x32.png')))

	//endpoints
	this.app.use(`${cf.ENDPOINT}/`, router)
	this.app.use('/', router)

	//errorHandler
	this.app.use(errorHandler)

}

server_listen() {
	this.server = new HttpServer(this.app)
	this.server.listen(cf.PORT, () => {
		if (cf.MASTER) {
			this.master_listen()
			console.log(`MASTER httpServer: listening on ${cf.PORT}`)
		} else if (cf.CLIENT) {
			this.client_listen()
			console.log(`CLIENT httpServer: listening on ${cf.PORT}`)
		}
	})
}

master_listen() {
	this.ioServer = socketio(this.server, {
		path: cf.SOCKETENDPOINT
	})
	this.bulkerService = new BulkerService(this.ioServer)
	this.ioServer.on('connection', socket => {
		console.log(socket.id + ' connected')
		socket.on('readyToBulk', bulk => {
			try {
				bulk(this.bulkerService.data)
				this.bulkerService.data = null
				this.bulkerService.OFFSET += this.bulkerService.LIMIT
				this.bulkerService.get_new_datasets()
			} catch (error) {
				L.error(error)
			}
		})
		socket.on('readyToCrawl', (amount, id, crawl) => {
			try {
				let data = null
				data = this.datasetsToCrawl.splice(this.datasetsToCrawl.length - amount)
				console.log(`${id} crawls: ${data.length}`)
				if (data) crawl(data)
				if (this.datasetsToCrawl.length <= 0 && this.getUrlsFlag) {
					this.getUrlsFlag = false
					this.get_urls()
				}
			} catch (error) {
				L.error(error)
			}
		})
	})

	this.crawl()
}

client_listen() {
	this.ioClient = io(cf.MASTERURL, {
		path: cf.SOCKETENDPOINT
	})
	this.bulkerService = new BulkerService()
	this.crawlerService = new CrawlerService()
	this.ioClient.on('connect', () => {
		console.log('client connected')
	})

	let promises: any[] = []

	this.ioClient.on('anyOneReadyToCrawl', () => {
		if (this.crawlerService.count < cf.CRAWL_asyncCount) {

			this.ioClient.emit('readyToCrawl', (cf.CRAWL_asyncCount - this.crawlerService.count), this.ioClient.id, async (data: { id: string; hostname: string }[]) => {
				if (data) {
					data.forEach((dataset: { id: string; hostname: string }) => {
						promises.push(this.crawlerService.crawl(dataset.id, dataset.hostname))
					})
					await Promise.all(promises)
					promises = []
				}
			})
		}
	})

	this.ioClient.on('anyOneReadyToBulk', () => {
		if (this.bulkerService.bulkCounter < cf.BULK_asyncCount) {
			this.ioClient.emit('readyToBulk', (data: any[]) => {
				if (data) this.bulkerService.bulk(data)
			})
		}
	})
}

/**
 * TODO get datasets to crawl from db at once
 */
async get_urls() {
	const hostsToCrawl = await db.host.find().getHostsToCrawl()
	const querys = await db.dataset.getDatasetIDsAndHostNamesToBeCrawledOneByHost()
	if (querys) {
		const datasets = []
		host: for (const host of hostsToCrawl) {
			for (const query of querys) {
				if (host.name == query.hostname) {
					datasets.push({
						id: query.dataset_url,
						hostname: query.hostname
					})
					continue host
				}
			}
		}
		this.datasetsToCrawl = datasets
	}
	this.getUrlsFlag = true
}

async crawl() {
	await this.get_urls()
	while (this.flag) {
		await this.bulkerService.checkForBulkUpdateDay()
		console.log('DS to crawl:' + this.datasetsToCrawl.length)
		this.ioServer.emit('anyOneReadyToCrawl')
		await sleep(cf.CRAWL_ticktime)
	}
}

}

const myServer = new Server()

export default myServer