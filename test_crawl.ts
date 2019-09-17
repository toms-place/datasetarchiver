import server from './server/index';
const sleep = require('util').promisify(setTimeout);
import {
	CrawlerService
} from './server/api/services/crawler.service';

server.on('listening', async () => {
	await test()
	process.exit()
})

async function test() {

	await CrawlerService.addHref('http://localhost:3000/testfiles/test.api.csv')
	await CrawlerService.crawlHref('http://localhost:3000/testfiles/test.api.csv')
	await sleep(1000)


}