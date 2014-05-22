var join = require('path').join
  , express = require('express')
  , compress = require('compression')
  , responseTime = require('response-time')
  , bodyParser = require('body-parser');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/popcorn_shows');

module.exports = function(config, app) {
	app.use(bodyParser());
	app.use(compress({
		threshold: 1400,
		level: 4,
		memLevel: 3
	}));
	app.use(responseTime());
}