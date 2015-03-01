var express = require('express');
var path = require('path');
var router = express.Router();

router.get('/', function (req, res)
{
    res.set('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

module.exports = router;