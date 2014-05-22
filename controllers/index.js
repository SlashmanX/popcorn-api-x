var os = require("os");
module.exports = {
	getIndex: function(req, res) {
		res.json({
			status: 'online', 
			uptime: process.uptime(), 
			server: os.hostname()
		});
	}
}