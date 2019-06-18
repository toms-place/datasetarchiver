"use strict";

var express = require('express');

var router = express.Router();
/* GET home page. */

router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'Express'
  });
});
/* GET file. */

router.get('/testFile.csv', function (req, res, next) {
  res.sendFile('/testFile.csv');
});

for (let i = 0; i < 10000; i++) {
  /* GET file. */
  router.get('/testFile.' + i + '.csv', function (req, res, next) {
    res.sendFile('/testFile.' + i + '.csv');
  });
}

module.exports = router;