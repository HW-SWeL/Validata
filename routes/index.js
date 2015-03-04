var express = require('express');
var path = require('path');
var router = express.Router();

router.get('/', function (req, res)
{
    res.set('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

router.get('/favicon.ico', function (req, res)
{
    res.set('Content-Type', 'image/x-icon');
    res.sendFile(path.join(__dirname, '../public/images', 'favicon.ico'));
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