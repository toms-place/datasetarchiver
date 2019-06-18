import http from 'http';
import assert from 'assert';

import server from '../dist/app.js';

describe('sample tests:', function() {
  it('callback', function(done) {
    http.get('http://127.0.0.1:3000', function(res) {
      assert.equal(200, res.statusCode);
      done();
    });
  });
});