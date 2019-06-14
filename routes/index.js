var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* GET file. */
router.get('/testFile.csv', function(req, res, next) {
  res.sendFile('/testFile.csv');
});


module.exports = router;
