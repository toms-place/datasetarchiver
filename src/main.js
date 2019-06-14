const fs = require('fs');
const Crawler = require('./crawler.js');

const getUrls = () => {
  var urls = fs.readFileSync('./testurls.txt').toString().split("\n");
  return urls;
}

const main = () => {
  for (let url of getUrls()) {
    try {
      new Crawler(url).crawl();
    } catch (error) {
      console.log("CATCH");
      console.log(error);
    }
  }
}

main();
//Crawler.uncompressDataSet("cdn.pixabay.com", "img-src-x-2310895_960_720.png", 0)