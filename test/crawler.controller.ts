import 'mocha';
import {
  expect
} from 'chai';
import request from 'supertest';
import Server from '../server';
import db from '../server/common/database';
import {
  CrawlerService
} from '../server/api/services/crawler.service';
import config from '../server/config';

before(async function () {
  await CrawlerService.addHref(`http://localhost:3000${config.endpoint}/testfiles/test.api.1.csv`)
  await CrawlerService.addHref(`http://localhost:3000${config.endpoint}/testfiles/test.api.2.csv`)
  await CrawlerService.addHref(`http://localhost:3000${config.endpoint}/testfiles/test.api.maxsize.csv`)
  await CrawlerService.addHref(`http://localhost:3000${config.endpoint}/testfiles/test.api.maxsize.1.csv`)
  await CrawlerService.addHref('http://donotreachme/test/1.csv')
  await CrawlerService.addHref('http://donotreachme/test/2.csv')
  await db.dataset.updateMany({
    id: ['http://donotreachme/test/2.csv'
    ,`http://localhost:3000${config.endpoint}/testfiles/test.api.maxsize.1.csv`
    ,`http://localhost:3000${config.endpoint}/testfiles/test.api.2.csv`]
  }, {
    $set: {
      'crawl_info.firstCrawl': false
    }
  }, {
    upsert: true,
    setDefaultsOnInsert: true
  })
});


after(async function () {

  let res = await db.dataset.deleteMany({
    id: {
      $in: [`http://localhost:3000${config.endpoint}/testfiles/test.api.csv`
      , `http://localhost:3000${config.endpoint}/testfiles/test.api.1.csv`
      , `http://localhost:3000${config.endpoint}/testfiles/test.api.2.csv`
      , 'http://donotreachme/test/1.csv'
      , 'http://donotreachme/test/2.csv'
      , `http://localhost:3000${config.endpoint}/testfiles/test.api.maxsize.csv`
      , `http://localhost:3000${config.endpoint}/testfiles/test.api.maxsize.1.csv`]
    }
  })
  let host = await db.host.deleteMany({
    name: {
      $in: ['localhost', 'donotreachme']
    }
  })
  let file = await db.file.deleteMany({
    name: {
      $in: ['test.api.maxsize.csv'
      , 'test.api.maxsize.1.csv'
      , 'test.api.csv'
      , 'test.api.1.csv'
      ,'test.api.2.csv']
    }
  })
  console.log('cleanup DB', res, host, file)
});

describe('API Tests:', () => {

  describe('ADD', () => {
    it('should add a href to db', () =>
      request(Server)
      .get(`${config.endpoint}/api/v1/addHref?href=http://localhost:3000${config.endpoint}/testfiles/test.api.csv`)
      .then(r => {
        expect(r.body['datasetstatus']).to.equal(200);
      }));
  })

  describe('CRAWL meta', () => {
    it('should crawl meta to init href', () =>
      request(Server)
      .get(`${config.endpoint}/api/v1/crawlHrefSync?href=http://localhost:3000${config.endpoint}/testfiles/test.api.1.csv`)
      .then(r => {
        expect(r.body).to.equal(true);
      }));
  })

  describe('CRAWL first', () => {
    it('should download whole file', () =>
      request(Server)
      .get(`${config.endpoint}/api/v1/crawlHrefSync?href=http://localhost:3000${config.endpoint}/testfiles/test.api.2.csv`)
      .then(r => {
        expect(r.body).to.equal(true);
      }));
  })

  describe('CRAWL second', () => {
    it('should download whole file', () =>
      request(Server)
      .get(`${config.endpoint}/api/v1/crawlHrefSync?href=http://localhost:3000${config.endpoint}/testfiles/test.api.2.csv`)
      .then(r => {
        expect(r.body).to.equal(true);
      }));
  })

  describe('CRAWL third', () => {
    it('should download whole file and calc new crawl', () =>
      request(Server)
      .get(`${config.endpoint}/api/v1/crawlHrefSync?href=http://localhost:3000${config.endpoint}/testfiles/test.api.2.csv`)
      .then(r => {
        expect(r.body).to.equal(true);
      }));
  })

});


describe('API failing Tests:', () => {

  describe('ADD fail', () => {
    it('should add a href to db and fail because of duplicate', () =>
      request(Server)
      .get(`${config.endpoint}/api/v1/addHref?href=http://localhost:3000${config.endpoint}/testfiles/test.api.1.csv`)
      .then(r => {
        expect(r.body['datasetstatus']).to.equal(409);
      }));
  })

  describe('CRAWL first fail', () => {
    it('should download whole file and fail', () =>
      request(Server)
      .get(`${config.endpoint}/api/v1/crawlHrefSync?href=http://donotreachme/test/1.csv`)
      .then(r => {
        expect(r.body).to.equal(false);
      }));
  })

  describe('CRAWL second fail', () => {
    it('should download whole file and fail', () =>
      request(Server)
      .get(`${config.endpoint}/api/v1/crawlHrefSync?href=http://donotreachme/test/2.csv`)
      .then(r => {
        expect(r.body).to.equal(false);
      }));
  })

  describe('CRAWL firts fail max size', () => {
    it('should download head of file and fail because of max file size', () =>
      request(Server)
      .get(`${config.endpoint}/api/v1/crawlHrefSync?href=http://localhost:3000${config.endpoint}/testfiles/test.api.maxsize.csv`)
      .then(r => {
        expect(r.body).to.equal(false);
      }));
  })

  describe('CRAWL second fail max size', () => {
    it('should download whole file and fail because of max file size', () =>
      request(Server)
      .get(`${config.endpoint}/api/v1/crawlHrefSync?href=http://localhost:3000${config.endpoint}/testfiles/test.api.maxsize.1.csv`)
      .then(r => {
        expect(r.body).to.equal(false);
      }));
  })

});