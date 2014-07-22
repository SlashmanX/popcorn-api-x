/*************************
**  Modules     **
**************************/

var request =   require('request');
var cheerio =   require('cheerio');
var moment  =   require('moment');
var async	=	require('async');

/*************************
**  Variables   **
**************************/

var BASE_URL    =   "http://katproxy.com";
var SHOWLIST    =   "/tv/show/";
var LATEST  =   "/tv/";
var SEARCH  =   "/usearch/";

var kickass_map = [];
kickass_map['the-office'] = 'the-office-us';

Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};

String.prototype.replaceAll = function(target, replacement) {
	return this.split(target).join(replacement);
};

exports.removeKickassId = function(str) {
    return str.substr(0, str.lastIndexOf('-'));
};

exports.removeEntities = function(str) {
    str = helpers.replaceAll(str, '%26', 'and');
    str = helpers.replaceAll(str, '%27', '');
    str = helpers.replaceAll(str, '%28', '');
    str = helpers.replaceAll(str, '%29', '');
    return str;
},

exports.showMap = kickass_map;

exports.getAllShows =   function(cb) {
	if(cb == null) return;
	request(BASE_URL + SHOWLIST, function(err, res, html){

		if(err) return (err, null);

		var $ = cheerio.load(html);
		var title, show;
		var allShows = [];

		$('li a.plain:not([id])').each(function(){
			var entry = $(this);
			var show = entry.text();
			if(entry.attr('href')) {
				var slug = entry.attr('href').replaceAll('/', '');
				slug = slug in kickass_map ? kickass_map[slug]: slug;
				allShows.push({show: show, slug: slug, provider: 'kickass'});
			}
		});

		return cb(null, allShows);
	});
}

exports.getAllEpisodes = function(data, cb) {
	if(cb == null) return;
	var episodes = {};

	console.log('Looking for: '+ BASE_URL + "/" + data.slug +"/torrents/");

	request.get(BASE_URL + "/" + data.slug +"/torrents/", function (err, res, html) {
		if(err) return cb(err, null);

		var $ = cheerio.load(html);

		var num_pages = parseInt($('.pages a:last-child').text(), 10);
		var current_page = 1;
		var num_processed = 0;

		async.times(num_pages,
			function (n, next) {
				var p = n + 1;
				request.get(BASE_URL + "/" + data.slug +"/torrents/?page="+ p, function (err, res, html) {
					if(err) return next(err, []);
					var $ = cheerio.load(html);
					var show_rows = $('table.data tr td:first-child');

					show_rows.each(function() {
						var entry = $(this);
						var title = entry.children('.torrentname').children('div').children('a.cellMainLink').text().replace('x264', ''); // temp fix
						var magnet = entry.children('.iaconbox').children('a.imagnet').attr('href');
						var matcher = title.match(/S?0*(\d+)?[xE]0*(\d+)/);
						var quality = title.match(/(\d{3,4})p/) ? title.match(/(\d{3,4})p/)[0] : "480p";
						if(matcher) {
							var season = parseInt(matcher[1], 10);
							var episode = parseInt(matcher[2], 10);
							if(season && episode) {
								var torrent = {};
								torrent.url = magnet;
								torrent.seeds = 0;
								torrent.peers = 0;
								if(!episodes[season]) episodes[season] = {};
								if(!episodes[season][episode]) episodes[season][episode] = {};
								if(!episodes[season][episode][quality] || title.toLowerCase().indexOf("repack") > -1)
									episodes[season][episode][quality] = torrent;
								episodes.dateBased = false;
							}
						}
						else {
							matcher = title.match(/(\d{4}) (\d{2} \d{2})/); // Date based TV Shows
							var quality = title.match(/(\d{3,4})p/) ? title.match(/(\d{3,4})p/)[0] : "480p";
							if(matcher) {
								var season = matcher[1]; // Season : 2014
								var episode = matcher[2].replace(" ", "/"); //Episode : 04/06
								var torrent = {};
								torrent.url = magnet;
								torrent.seeds = 0;
								torrent.peers = 0;
								if(!episodes[season]) episodes[season] = {};
								if(!episodes[season][episode]) episodes[season][episode] = {};
								if(!episodes[season][episode][quality] || title.toLowerCase().indexOf("repack") > -1)
									episodes[season][episode][quality] = torrent;
								episodes.dateBased = true;
							}
						}
					});

					return next(err, []);
				})
			},
			function (err, eps) {
				return cb(null, episodes);
			}
		);

});
}
