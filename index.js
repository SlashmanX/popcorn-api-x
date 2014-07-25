var cluster = require('cluster')
  , app = require('express')()
  , cpuCount = require('os').cpus().length;

// settings
var config = require('./config.js');
var helpers = require('./lib/helpers');
// config
require('./setup.js')(config, app);
// routes
require('./routes.js')(app);

if(cluster.isMaster) {

    // Fork the child threads
    for (var i = 0; i < Math.min(cpuCount, config.workers); i++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died, spinning up another!');
        cluster.fork();
    });
        
    // Update the database every hour
    try {
        var CronJob = require('cron').CronJob;
        var job = new CronJob(config.scrapeTime, 
            function(){
                helpers.update();
            }, function () {
                // This function is executed when the job stops
            },
            true
        );
        console.log("Cron job started");
    } catch(ex) {
        console.log("Cron pattern not valid");
    }
    // Start extraction right now
    helpers.update();

} else {
    app.listen(config.port);
}