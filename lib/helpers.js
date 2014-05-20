var helpers = {
	
	// Source: http://stackoverflow.com/a/1714899/192024
	buildQuerystring: function(obj) {
		var str = []
		for(var p in obj)
			if (obj.hasOwnProperty(p))
				str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]))
		return str.join('&')
	},
	
	// Source: http://phpjs.org/functions/preg_quote/
	preg_quote: function(str, delimiter) {
		return String(str)
			.replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]', 'g'), '\\$&');
	},
	
	// Determine if a given string matches a given pattern.
	// Inspired by PHP from Laravel 4.1
	str_is: function(pattern, value) {
		if(pattern == value) return true
		if(pattern == '*') return true
		
		pattern = this.preg_quote(pattern, '/')
		
		// Asterisks are translated into zero-or-more regular expression wildcards
		// to make it convenient to check if the strings starts with the given
		// pattern such as "library/*", making any string check convenient.
		var regex = new RegExp('^' + pattern.replace('\\*', '.*') + '$')
		
		return !!value.match(regex);
	},
	
	// Source: http://jamesroberts.name/blog/2010/02/22/string-functions-for-javascript-trim-to-camel-case-to-dashed-and-to-underscore/comment-page-1/
	stringToCamel: function(str) {
		return str.replace(/(\-[a-z])/g, function($1){
			return $1.toUpperCase().replace('-','')
		})
	}
}

module.exports = helpers
