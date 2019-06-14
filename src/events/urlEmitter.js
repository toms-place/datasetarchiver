const EventEmitter = require('events');
const Crawler = require('../crawler.js');
const Crawlers = {};

class UrlEmitter extends EventEmitter {};

const urlEmitter = new UrlEmitter();

urlEmitter.on('addUrl', (uri) => {
  console.log("add", uri);
  Crawlers[uri] = new Crawler(uri);
  console.log(Crawlers[uri]);
});

urlEmitter.on('deleteUrl', (uri) => {
  console.log("delete", uri);
  console.log(Crawlers[uri]);
  Crawlers[uri].stop();
});

urlEmitter.on('stopUrl', (uri) => {
  console.log("stop", uri);
  console.log(Crawlers[uri]);
  Crawlers[uri].stop();
});

urlEmitter.on('startUrl', (uri) => {
  console.log("start", uri);
  console.log(Crawlers[uri]);
  Crawlers[uri].start();
});

module.exports = urlEmitter;