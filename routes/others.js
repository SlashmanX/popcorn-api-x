var os = require("os");

module.exports = function(server){

    server.get('/', function(req, res) {
        res.json(202, {status: 'online', uptime: process.uptime(), server: os.hostname()});
    });

}