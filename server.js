'use strict';

var express = require('express'),
    path = require('path'),
    fs = require('fs'),
    mongoose = require('mongoose');

/**
 * Main application file
 */

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Application Config
var config = require('./lib/config/config');

// Connect to database
var db = mongoose.connect(config.mongo.uri, config.mongo.options);
mongoose.set('debug', ( process.env.NODE_ENV === 'development' ? true:false));


// Bootstrap models
var modelsPath = path.join(__dirname, 'lib/models');
fs.readdirSync(modelsPath).forEach(function (file) {
  if (/(.*)\.(js$|coffee$)/.test(file)) {
    require(modelsPath + '/' + file);
  }
});

// Populate empty DB with sample data
// require('./lib/config/dummydata');

// Passport Configuration
var passport = require('./lib/config/passport');

var app = express();

// upload
app.use(express.limit(1024*1024*12)); // 12mb
app.use(express.bodyParser({ keepExtensions: true, uploadDir:__dirname+"/tmp" }));

// Express settings
require('./lib/config/express')(app);

// Routing
require('./lib/routes')(app);

// Start server
// var server;
// app.server = null;
// app.stop = function(){
//   app.server.getConnections( function(err,count){
//     if(err){ console.log( err ); }
//     console.log( "connections:"+count);
//   });
//   console.log("server stopping.");
//   app.server.close( function(){
//     console.log("server stopped.");
//   });
// };
// app.start = function(){
app.server = app.listen(config.port, function () {
  console.log('Express server listening on port %d in %s mode', config.port, app.get('env'));
});
  // return app.server;
// };

// Expose app
exports = module.exports = app;
