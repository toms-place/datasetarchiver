import dotenv from 'dotenv'
dotenv.config()

let MASTER = false
if (process.env.MASTER)
	if (process.env.MASTER.toLowerCase() == 'true') MASTER = true
let CLIENT = false
if (process.env.CLIENT)
	if (process.env.CLIENT.toLowerCase() == 'true') CLIENT = true
let LEGACY = false
if (process.env.LEGACY)
	if (process.env.LEGACY.toLowerCase() == 'true') LEGACY = true
let PRODUCTION = false
if (process.env.PRODUCTION)
	if (process.env.PRODUCTION.toLowerCase() == 'true') PRODUCTION = true
let DEBUG = false
if (process.env.DEBUG)
	if (process.env.DEBUG.toLowerCase() == 'true') DEBUG = true
const BULK_INTERVAL = parseInt(process.env.BULK_INTERVAL) || 30000
const BULKDAY = parseInt(process.env.BULKDAY) || 8
const BULK_asyncCount = parseInt(process.env.BULK_asyncCount) || 1
const PORT = parseInt(process.env.PORT) || 3000
const URL = process.env.URL || 'http://localhost:3000'
const MASTERURL = process.env.MASTERURL || 'http://localhost:3000'
const SOCKETENDPOINT = process.env.SOCKETENDPOINT || '/socket'
const SPARQLGRAPH = process.env.SPARQLGRAPH || 'https://data.wu.ac.at/portalwatch/ld/'

const APP_ID = process.env.APP_ID || 'datasetarchiver'
const LOG_LEVEL = process.env.LOG_LEVEL || 'debug'
const OPENAPI_SPEC = process.env.OPENAPI_SPEC || '/spec'
const ENDPOINT = process.env.ENDPOINT || ''
const DB_Server = process.env.DB_Server || 'localhost:27017'
const DB_Name = process.env.DB_Name || 'archiver_test'
const DB_Poolsize = parseInt(process.env.DB_Poolsize) || 5
const CRAWL_HostInterval = parseInt(process.env.CRAWL_HostInterval) || 5
const CRAWL_minRange = parseInt(process.env.CRAWL_minRange) || 21600
const CRAWL_maxRange = parseInt(process.env.CRAWL_maxRange) || 5256000
const CRAWL_DistributionArrayMax = parseInt(process.env.CRAWL_DistributionArrayMax) || 10
const CRAWL_asyncCount = parseInt(process.env.CRAWL_asyncCount) || 10
const CRAWL_hostMaxDataset = parseInt(process.env.CRAWL_hostMaxParallel) || 10000
const CRAWL_hostMaxParallelPercent = parseInt(process.env.CRAWL_hostMaxParallelPercent) || 1
const CRAWL_timeout = parseInt(process.env.CRAWL_timeout) || 30000
const CRAWL_ticktime = parseInt(process.env.CRAWL_ticktime) || 5000
const secret = process.env.SECRET || 'THIS_IS_A_SECRET'
const pass = process.env.PASS || 'THIS_IS_A_PASS'
const batchAmount = parseInt(process.env.batchAmount) || 2000
const ErrorCountTreshold = parseInt(process.env.ErrorCountTreshold) || 3
const MaxFileSizeInBytes = parseInt(process.env.MaxFileSizeInBytes) || 100000000

export default {
	MASTER,
	MASTERURL,
	URL,
	CLIENT,
	BULK_INTERVAL,
	PORT,
	LEGACY,
	SOCKETENDPOINT,
	BULKDAY,
	BULK_asyncCount,
	SPARQLGRAPH,
	PRODUCTION,
	DEBUG,
	ENDPOINT,
	DB_Server,
	DB_Name,
	CRAWL_HostInterval,
	CRAWL_minRange,
	CRAWL_maxRange,
	ErrorCountTreshold,
	MaxFileSizeInBytes,
	CRAWL_DistributionArrayMax,
	APP_ID,
	LOG_LEVEL,
	OPENAPI_SPEC,
	secret,
	pass,
	CRAWL_asyncCount,
	CRAWL_timeout,
	CRAWL_ticktime,
	DB_Poolsize,
	batchAmount,
	CRAWL_hostMaxParallelPercent,
	CRAWL_hostMaxDataset
}