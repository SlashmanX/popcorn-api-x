/*************************
**  Modules     **
**************************/

var request =   require('request');
var cheerio =   require('cheerio');
var moment  =   require('moment');
var async	=	require('async');
var zlib	=	require('zlib');
var byline	=	require('byline');
var winston	=	require('winston');
var logger 	=	new (winston.Logger)({
  transports: [
	new (winston.transports.File)(
		{ 
			filename: 'kickass.log'
		})
  ]
});

/*************************
**  Variables   **
**************************/

var BASE_URL    =   "http://katproxy.com";
var SHOWLIST    =   "/tv/show/";
var LATEST  =   "/tv/";
var SEARCH  =   "/usearch/";
var API_URL_HOURLY = "http://kickass.to/hourlydump.txt.gz";
var API_URL_DAILY= "http://kickass.to/dailydump.txt.gz";

var kickass_map = [];
var kickass_extras = []; // Some shows don't appear on the showlist

// Maps
kickass_map['the-office'] = 'the-office-us';
kickass_map['reign'] = 'reign-2013';

// Extras
kickass_extras.push({show: 'American Horror Story', slug: 'american-horror-story-tv28776', provider: 'kickass'});
kickass_extras.push({show: 'Anger Management', slug: 'anger-management-tv29999', provider: 'kickass'});
kickass_extras.push({show: 'Arrow', slug: 'arrow-tv30715', provider: 'kickass'});
kickass_extras.push({show: 'Awkward', slug: 'awkward-tv28691', provider: 'kickass'});
kickass_extras.push({show: 'Breaking Amish', slug: 'breaking-amish-tv32524', provider: 'kickass'});
kickass_extras.push({show: 'Devious Maids', slug: 'devious-maids-tv30826', provider: 'kickass'});
kickass_extras.push({show: 'From Dusk Till Dawn: The Series', slug: 'from-dusk-till-dawn-the-series-tv38931', provider: 'kickass'});
kickass_extras.push({show: 'The Flash (2014)', slug: 'the-flash-2014-tv36939', provider: 'kickass'});
kickass_extras.push({show: 'Grimm', slug: 'grimm-tv28352', provider: 'kickass'});
kickass_extras.push({show: 'Hart of Dixie', slug: 'hart-of-dixie-tv28422', provider: 'kickass'});
kickass_extras.push({show: 'House of Cards (2012)', slug: 'house-of-cards-2012-tv27822', provider: 'kickass'});
kickass_extras.push({show: 'Helix', slug: 'helix-tv34277', provider: 'kickass'});
kickass_extras.push({show: 'Masters of Sex', slug: 'masters-of-sex-tv32002', provider: 'kickass'});
kickass_extras.push({show: 'New Girl', slug: 'new-girl-tv28304', provider: 'kickass'});
kickass_extras.push({show: 'Once Upon A Time', slug: 'once-upon-a-time-tv28385', provider: 'kickass'});
kickass_extras.push({show: 'The Originals', slug: 'the-originals-tv34166', provider: 'kickass'});
kickass_extras.push({show: 'Reign', slug: 'reign-tv34590', provider: 'kickass'});
kickass_extras.push({show: 'Salem', slug: 'salem-tv36241', provider: 'kickass'});
kickass_extras.push({show: 'The Strain', slug: 'the-strain-tv33229', provider: 'kickass'});
kickass_extras.push({show: 'Suits', slug: 'suits-tv27518', provider: 'kickass'});
kickass_extras.push({show: 'Teen Wolf', slug: 'teen-wolf-tv27575', provider: 'kickass'});
kickass_extras.push({show: 'True Detective', slug: 'true-detective-tv31369', provider: 'kickass'});
kickass_extras.push({show: 'Under The Dome', slug: 'under-the-dome-tv25988', provider: 'kickass'});
kickass_extras.push({show: 'Vikings', slug: 'vikings-tv31136', provider: 'kickass'});
kickass_extras.push({show: 'Web Therapy', slug: 'web-therapy-tv28687', provider: 'kickass'});
kickass_extras.push({show: 'The Wil Wheaton Project', slug: 'the-wil-wheaton-project-tv41764', provider: 'kickass'});
String.prototype.replaceAll = function(target, replacement) {
	return this.split(target).join(replacement);
};

removeKickassId = function(str) {
	return str.substr(0, str.lastIndexOf('-'));
};

// There must be a better way of doing this but I'm too lazy to find it
removeEntities = function(str) {
	str = str.replaceAll('%26', 'and');
	str = str.replaceAll('%27', '');
	str = str.replaceAll('%28', '');
	str = str.replaceAll('%29', '');
	str = str.replaceAll('%21', '');
	str = str.replaceAll('.', '');
	str = str.replaceAll('%3A', '');
	str = str.replaceAll('%C2', '');
	str = str.replaceAll('%B0', '');
	str = str.replaceAll('%2C', '');
	str = str.replaceAll('%3F', '');
	str = str.replaceAll('%E2', '');
	str = str.replaceAll('%80', '');
	str = str.replaceAll('%99', '');
	str = str.replaceAll('%2F', '');
	str = str.replaceAll('%21', '');
	str = str.replace(/-{2,}/g, '-'); // Replace multiple hyphens with 1
	return str;
},

exports.cleanSlug = function(str) {
	str = removeKickassId(str);
	return removeEntities(str);
}

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
				allShows.push({show: show, slug: slug, provider: 'kickass'});
			}
		});
		allShows = allShows.concat(kickass_extras);

		return cb(null, allShows);
	});
}

exports.getAllEpisodes = function(data, cb) {
	if(cb == null) return;
	var episodes = {};

	logger.info('Looking for: '+ BASE_URL + "/" + data.slug +"/torrents/");

	request.get(BASE_URL + "/" + data.slug +"/torrents/", function (err, res, html) {
		if(err) return cb(err, null);

		var $ = cheerio.load(html);

		var num_pages = parseInt($('.pages a:last-child').text(), 10)  || 1;
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
};

exports.update = function(since, callback) {
	var updated = [];
	var totalEntries = 0;

	var stream = byline.createStream();
	var req = request(API_URL_HOURLY, {encoding: null});
	req.on('response', function(res){
		res.pipe(zlib.createGunzip()).pipe(stream);
	});
	stream.on('data', function(line) {
		var data = parseLine(line.toString('utf8'));
		if(!data) return;
		if(data.category != 'TV') return;
		updated.push(data);

		totalEntries++;
	});

	stream.on('end', function() {
		callback(null, updated);
	});
};

parseLine = function(line) {
	var EPISODE_INFO = [
		/^(.+)[\t\s]S?0*(\d+)[xE]0*(\d+)/i,
		/^(.+)[\t\s](\d{4}) (\d{2} \d{2})/i // date based, needs better detection but that will be done above
	]
	var QUALITY_INFO = /(480p|720p|1080p)/i;
	var BLACKLIST = [
		/HDTV/i,
		/X264/i,
		/XviD/i,
		/AAC/i,
		/MKV/i
	];
	//console.log(line);
	var params = line.split('|'), title, season, episode, quality;
	if(!params[1]) return null;
	params[1] = params[1].replace(/\./g, ' ').trim();

	// Filter our any words we don't need
	for(var i in BLACKLIST) {
		params[1] = params[1].replace(BLACKLIST[i], '').trim();
	}

	if(QUALITY_INFO.test(params[1])) {
		quality = QUALITY_INFO.exec(params[1])[1];
		params[1] = params[1].replace(QUALITY_INFO, '').trim();
	}
	for(var i in EPISODE_INFO) {
		var reg = EPISODE_INFO[i];
		if(reg.test(params[1])) {
			var matches = reg.exec(params[1]);
			title = matches[1].trim();
			season = matches[2];
			episode = matches[3].replace(" ", "/");
			break;
		}
	}
	if(!episode || !season) return null;
	return {
		hash: params[0],
		filename: params[1],
		category: params[2],
		link: params[3],
		torrent: params[4],
		title: title ? title : '',
		season: season ? season : 0,
		episode: episode ? episode : 0,
		quality: quality ? quality : '480p' // default to 480p, might as well
	};
}
