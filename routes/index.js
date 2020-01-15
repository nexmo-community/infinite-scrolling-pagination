var express = require('express');
var router = express.Router();

/* GET home */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Nexmo' });
});

module.exports = router;
