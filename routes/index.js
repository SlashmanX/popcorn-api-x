// Inspired by http://stackoverflow.com/a/6064205/192024

var fs = require('fs')

module.exports = function(server, restify){
	fs.readdirSync(__dirname).forEach(function(file) {
		// Ignore this file and invalid ones
		if(file == 'index.js' || file.substr(0, 1) == '.') {
			return
		}
		var name = file.substr(0, file.indexOf('.'))
		require('./' + name)(server, restify)
	})
}