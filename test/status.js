import http from 'http';
import assert from 'assert';
const {
  host,
  port,
  protocol
} = require('../src/config');

import server from '../dist/app.js';

setTimeout(function () {

  describe('hooks', function () {
    before(function () {
      // runs before all tests in this block
      describe('status tests:', function () {
        it('callback', function (done) {
          http.get(`${protocol}//${host}:${port}`, function (res) {
            assert.equal(200, res.statusCode);
            done();
          });
        });
      });
      describe('add test:', function () {
        it('callback', function (done) {
          http.get(`${protocol}//${host}:${port}/add?url=${protocol}//${host}:${port}/testfile/test.zip`, function (res) {
            assert.equal(200, res.statusCode);
            done();
          });
        });
      });
    });

    after(function () {
      // runs after all tests in this block
      describe('delete test:', function () {
        it('callback', function (done) {
          http.get(`${protocol}//${host}:${port}/delete?url=${protocol}//${host}:${port}/testfile/test.zip`, function (res) {
            assert.equal(200, res.statusCode);
            done();
          });
        });
      });
    });

    beforeEach(function () {
      // runs before each test in this block
      describe('crawl test:', function () {
        it('callback', function (done) {
          http.get(`${protocol}//${host}:${port}/crawl?url=${protocol}//${host}:${port}/testfile/test.zip`, function (res) {
            assert.equal(200, res.statusCode);
            done();
          });
        });
      });
    });

    afterEach(function () {
      // runs after each test in this block
    });

    // test cases
  });






  run();
}, 5000);