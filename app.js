var fs = require('fs')
var restify = require('restify')
var mongoose = require('mongoose')

// Load environments
var config = require(__dirname + '/lib/environment')()
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var server = restify.createServer({
	
	// Uncomment to enable SSL
	/*certificate: fs.readFileSync('ssl/ssl-cert.pem'),
	key: fs.readFileSync('ssl/ssl-key.pem'),*/
	
	name: 'popcorn-api',
	version: '1.0.0'
})

// Database connection
mongoose.connect(config.mongodb)

// Save the config, session and mongoose objects in the server
server.appConfig = config
server.mongoose = mongoose

server.use(restify.acceptParser(server.acceptable))
server.use(restify.queryParser())
server.use(restify.bodyParser())
server.use(restify.gzipResponse())
server.pre(restify.pre.sanitizePath()) // Sanitize paths like //foo/////bar// to /foo/bar

server.pre(function(req, res, callback) {
	// Cleanup path
	restify.pre.sanitizePath()
	
  // Include some headers
	if (!res.getHeader('Server')) res.setHeader('Server', res.serverName)
	if (res.version && !res.getHeader('X-Api-Version')) res.setHeader('X-Api-Version', res.version)
	if (!res.getHeader('X-Request-Id')) res.setHeader('X-Request-Id', req.getId())
	
	callback();

})

// Routing
require('./routes')(server, restify)

// Clustering
if (cluster.isMaster) {

  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });

} else {
  
  server.listen(config.httpPort, function () {
    console.log('%s listening at %s', server.name, server.url)
  })  

}

