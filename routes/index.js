var express = require('express');
var path = require('path');
var router = express.Router();

router.get('/', function (req, res)
{
    res.set('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

router.get('/admin', function (req, res)
{
    res.set('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, '../public', 'admin.html'));
});

router.get('/generator', function (req, res)
{
    res.set('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, '../public', 'generator.html'));
});

module.exports = router;