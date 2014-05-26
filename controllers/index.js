var os = require("os");
module.exports = {
	getIndex: function(req, res) {
		res.json({
			status: 'online', 
			uptime: process.uptime() | 0, 
			server: os.hostname()
		});
	}
}
