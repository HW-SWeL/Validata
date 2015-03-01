// Create a "global" object to store references to all the libraries we are using, which we will then pass down into our modules for convenience
var env = {};

// Require all the various modules we use components from
env.express = require('express');
env.path = require('path');
env.favicon = require('serve-favicon');
env.http = require('http');
env.logger = require('morgan');
env.cookieParser = require('cookie-parser');
env.bodyParser = require('body-parser');
env.assert = require('assert');
env.app = env.express();

// Enable dev logging
env.app.use(env.logger('dev'));

// require('./validata.js')(env);

env.app.use(env.express.static(env.path.join(__dirname, 'public')));
env.app.use('/', require('./routes/index'));

// catch 404 and forward to error handler
env.app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (env.app.get('env') === 'development') {
    env.app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.status(err.status || 500).send( '<pre>' + err.stack + '</pre>' );
    });
}

// production error handler
// no stacktraces leaked to user
env.app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send( err.message );
});


module.exports = env.app;
