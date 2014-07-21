var os = require("os");
var helpers = require('../lib/helpers');
var auth = require('basic-auth');
module.exports = {
	getIndex: function(req, res) {
		res.json({
			status: 'online', 
			uptime: process.uptime() | 0, 
			server: 'slashmanx'
		});
	},

	refreshDatabase: function(req, res) {
		var user = auth(req);
		if(user && user.name === 'Slashman X' && user.pass === 'p0pc0rnT1me'){
			helpers.refreshDatabase();
			res.end('Refreshing');
		} else {
			res.set({
				'WWW-Authenticate': 'Basic realm="simple-admin"'
			}).send(401);
		}
	}
}
