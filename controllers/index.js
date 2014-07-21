var os = require("os");
var helpers = require('../lib/helpers');
module.exports = {
	getIndex: function(req, res) {
		res.json({
			status: 'online', 
			uptime: process.uptime() | 0, 
			server: 'slashmanx'
		});
	},

	refreshDatabase: function(req, res) {
		helpers.refreshDatabase();
		res.end('Refreshing');
	}
}
