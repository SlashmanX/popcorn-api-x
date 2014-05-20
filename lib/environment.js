var os = require('os')
var fs = require('fs')
var helpers = require(__dirname + '/../lib/helpers')

module.exports = function() {
	var config = {}
	
	// Load environments
	var currentEnvironment = false
	if(process.env.NODE_ENV) {
		currentEnvironment = process.env.NODE_ENV
	} else {
		var environments = require(__dirname + '/../config/EnvironmentsConfig')
		var hostname = os.hostname()
		
		for(var env in environments) {
			var list = environments[env]
			if(typeof list == 'string') list = [list]
			for(var i in list) {
				if(helpers.str_is(list[i], hostname)) {
					currentEnvironment = env
					break
				}
			}
			if(currentEnvironment) break
		}
	}
	// Should never happen, but default to production
	if(!currentEnvironment) currentEnvironment = 'production'
	
	config.env = currentEnvironment
	
	var configFilename = __dirname + '/../config/config.' + currentEnvironment + '.json'
	var isWindows = /^win/.test(os.platform())
	if(fs.existsSync(configFilename)) {
		var read = require(configFilename)
		
		var setConfig = function(read) {
			for(var key in read) {
				if(key == '$windows' && isWindows) {
					setConfig(read[key])
				}
				else if(key == '$unix' && !isWindows) {
					setConfig(read[key])
				}
				else {
					var camel = helpers.stringToCamel(key)
					
					config[key] = read[key]
					if(camel != key)
						config[camel] = read[key]
				}
			}
		}
		setConfig(read)
	}
	
	return config
}
