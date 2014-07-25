var Show = require('../models/Show')
var eztv = require('./eztv')
var kickass = require('./kickass')
var providers = {};
//providers.eztv = eztv;
providers.kickass = kickass;
var async = require('async')
var Trakt = require('trakt')
var trakt = new Trakt({api_key: '7b7b93f7f00f8e4b488dcb3c5baa81e1619bb074'})
var TTL = 1000 * 60 * 60 * 10;
var winston = require('winston');
var traktLogger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({ filename: 'trakt.log' })
  ]
});
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)(
    	{ 
    		filename: 'api.log'
    	})
  ]
});

var exception = new (winston.Logger)({
  transports: [
    new (winston.transports.File)(
    	{ 
    		filename: 'error.log',
    		handleExceptions: true
    	})
  ]
});
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
	},

	getEpisodeFromShow: function(eps, season, episode) {
		var ep;
		for(var e in eps) {
			ep = eps[e];
			if(ep.season && ep.season.toString() === season.toString() && ep.episodes && ep.episode.toString() === episode.toString()) {
				return e;
			}
		}
		return null;
	},



  extractShowInfo: function(show, callback) {

      var that = this;
      logger.info("extractShowInfo " + show.show + " " + show.imdb_id);
      var thisShow = {};
      var thisEpisodes = [];
      var thisEpisode = {};
      var numSeasons = 0;

      var imdb = show.imdb_id;

      if(!imdb) {
        return callback(null, show);
      }

      providers[show.provider].getAllEpisodes(show, function(err, data) {
          thisShow = data;

          if(!data) return callback(null, show);
          logger.info("Looking for "+ show.show);
          
          var dateBased = data.dateBased;
          delete data.dateBased;

          numSeasons = Object.keys(data).length; //Subtract dateBased key

          // upate with right torrent link
          if(!dateBased) {
            async.each(Object.keys(data), function(season, cb) {
              try {
                trakt.request('show', 'season', {title: imdb, season: season}, function(err, seasonData) {
                  for(var episodeData in seasonData){
                    episodeData = seasonData[episodeData];
                    if (typeof(data[season]) != 'undefined' && typeof(data[season][episodeData.episode]) != 'undefined') {
                    // hardcode the 720 for this source
                    // TODO: Should add it from eztv_x
                    thisEpisode = {
                      tvdb_id: episodeData.tvdb_id,
                      season: episodeData.season,
                      episode: episodeData.episode,
                      title: episodeData.title,
                      overview: episodeData.overview,
                      date_based: false,
                      first_aired: episodeData.first_aired_utc,
                      watched : {watched: false},
                      torrents: []
                    };
                    thisEpisode.torrents = data[season][episodeData.episode];
                    thisEpisode.torrents[0] = data[season][episodeData.episode]["480p"] ? data[season][episodeData.episode]["480p"] : data[season][episodeData.episode]["720p"]; // Prevents breaking the app
                    thisEpisodes.push(thisEpisode);
                  }
                }
                cb();
              });
              } catch (err) {
                logger.err("Pushing Episode error:", err)
                return cb();
              }
            },
            function(err, res) {
             // Only change "lastUpdated" date if there are new episodes
             Show.find({imdb_id: imdb}, function(err, show) {
                 if(err) return callback(err, null);
                 if(show.episodes != thisEpisodes) {
                     Show.update({ imdb_id: imdb },
                         { $addToSet: { episodes: {$each: thisEpisodes}}, $set: {last_updated: +new Date(), num_seasons: numSeasons}},
                         function(err, show) {
                             return callback(err, null);
                         });
                 }
                 else {
                     return callback(null, show);
                 }
             });

         });
        }
        else {

            try {

              trakt.request('show', 'summary', {title: imdb, extended: "full"}, function(err, show) {
                if(!show) return callback(null, show);
                else {
                  var seasons = show.seasons;
                  async.each(seasons, function(season, cbs) {
                    var episodes = season.episodes;
                    async.each(episodes, function(episode, cbe){
                      var aired = episode.first_aired_iso;
                      if(aired){
                        var year_aired = aired.substring(0, aired.indexOf("-"));
                        var date_aired = aired.substring(aired.indexOf("-") + 1, aired.indexOf("T")).replace("-", "/");
                        if(typeof(data[year_aired]) != 'undefined' && typeof(data[year_aired][date_aired]) != 'undefined')
                        {
                          thisEpisode = {
                            tvdb_id: episode.tvdb_id,
                            season: episode.season,
                            episode: episode.episode,
                            title: episode.title,
                            overview: episode.overview,
                            first_aired: episode.first_aired_utc,
                            date_based: true,
                            year: year_aired,
                            day_aired: date_aired,
                            watched : {watched: false},
                            torrents: []
                          };
                          thisEpisode.torrents = data[year_aired][date_aired];
                          thisEpisode.torrents[0] = data[year_aired][date_aired]["480p"] ? data[year_aired][date_aired]["480p"] : data[year_aired][date_aired]["720p"]; // Prevents breaking the app
                          thisEpisodes.push(thisEpisode);
                        }
                      }
                      return cbe();
                    },
                    function(err, res) {return cbs()})
                  }, function(err, res) {
                 // Only change "lastUpdated" date if there are new episodes
                 Show.find({imdb_id: imdb}, function(err, show) {
                     if(err)  return callback(err, null);
                     if(show.episodes != thisEpisodes) {
                         Show.update({ imdb_id: imdb },
                             { $set: { episodes: thisEpisodes, last_updated: +new Date(), num_seasons: numSeasons}},
                             function(err, show) {
                                 return callback(err, null);
                             });
                     }
                     else {
                         return callback(null, show);
                     }
                 });

                });
              }
            });

          } catch (err) {
                  logger.error("Error:", err);
                  return callback(err, null);
          }

        }

      });
  },


  refreshDatabase: function () {
      var allShows = [];
      var that = this;
      Show.remove({}, function(err, docs) { // delete database before refresh
	      async.each(Object.keys(providers), function(provider, cb) {
	          providers[provider].getAllShows(function(err, shows) {
	              if(err) return console.error(err);
	              allShows.push(shows);
	              cb();
	          });
	      }, function (error) {
	          if(error) return console.error(error);

	          // 2 process? 
	          async.each(allShows, function(shows, cb) {
	            async.mapLimit(shows, 2, helpers.extractTrakt, function(err, results){
	              logger.info("Provider complete");
	              cb();

	            });
	          }, function(err) {
	            logger.info('All Done');
	          });
	          
	      });
	  });
    },

    extractTrakt: function (show, callback) {
      var that = this;
      var slug = show.slug;
      var origSlug = show.slug;
      slug = providers[show.provider].cleanSlug(show.slug);

      slug = slug in providers[show.provider].showMap ? providers[show.provider].showMap[slug]: slug;
        try {
        logger.info("Extracting "+ show.show);
        Show.findOne({slug: origSlug}, function(err, doc){

            if(err || !doc) {
                logger.info("New Show");
                try {
                    trakt.request('show', 'summary', {title: slug}, function(err, data) {
                      if(err) {
                          traktLogger.info(slug);
                      }
                    if (!err && data) {

                        // ok show exist
                        var newShow =  new Show ({
                            _id: data.imdb_id,
                            imdb_id: data.imdb_id,
                            tvdb_id: data.tvdb_id,
                            title: data.title,
                            year: data.year,
                            images: data.images,
                            slug: show.slug,
                            synopsis: data.overview,
                            runtime: data.runtime,
                            rating: data.ratings,
                            genres: data.genres,
                            country: data.country,
                            network: data.network,
                            air_day: data.air_day,
                            air_time: data.air_time,
                            status: data.status,
                            num_seasons: 0,
                            last_updated: 0
                        });

                        newShow.save(function(err, newDocs) {
                            show.imdb_id = data.imdb_id;
                            helpers.extractShowInfo(show, function(err, show) {
                                return callback(err, show);
                            });
                        });
                    } 
                    else {
                        return callback(null, show);
                    }
                })
            } catch (err) {
                logger.error(slug + ' / '+ err)
                return callback(null, show);
            }
        }
        else {
            logger.info("Existing Show: Checking TTL");
            // compare with current time
            var now = +new Date();
            if ( (now - doc.last_updated) > TTL ) {
                logger.info("TTL expired, updating info");
                show.imdb_id = doc.imdb_id;
                //TODO: Change this to just get new rating or something
                try {
                  trakt.request('show', 'summary', {title: slug}, function(err, data) {
                      if (!err && data) {
                        Show.update({ _id: doc._id },
                             { $set: { rating: data.ratings, status: data.status}},
                             function(err, doc1) {
                              helpers.extractShowInfo(show, function(err, show) {
                                return callback(err, show);
                              });
                            });
                      }
                  });
                } catch (err) {
                    logger.error("Error: "+ slug + ' / '+ err)
                    return callback(err, null);
                }               
            }
            else {
                return callback(null, show);
            }
        }
      });

    } catch (err) {
      logger.error("Error: "+ slug + ' / '+ err)
      return callback(err, null);
    }

  },

  update: function(callback) {
  	kickass.update('', function(err, updated) {
  		async.mapLimit(updated, 2, function(update, cb) {
  			helpers.addEpisodeToDb(update, cb)
  		}, 
  		function(err, results){
  			logger.info("Update complete");
  			callback(results);
  		});
  	})
  },

  addEpisodeToDb: function(episode, callback) {

  	// Get trakt info for show first
  	// Check db if show exists, get episodes
  	// Check if episode exists
  	// Does: Add quality torrent link and update db (If REPACK, replace existing torrent)
  	// Doesn't: Trakt lookup episode info and add to db
  	// Should add episodes with no Trakt info to the db anyway, as long as there's show info

  	trakt.request('search', 'shows', {query: episode.title, limit: 1}, function(err, data) {
  		if(err) logger.error(err);
		if (!err && data && data[0]) {
			var show = data[0];
			logger.info('Searching: '+ episode.title + ' / Found: '+ show.title)
			Show.findOne({ imdb_id: show.imdb_id }, function(err, doc){
				if(err || !doc) {
					logger.info('Show not in database: '+ episode.title);
					return callback(null, episode);
				}
				var episodes = doc.episodes;
				var e = helpers.getEpisodeFromShow(episodes, episode.season, episode.episode);
				if(episodes[e]) { // exists add torrent to existing info
					logger.info(episode.season + ' / '+ episode.episode + ' / '+ show.title);
					if(!episodes[e].torrents[episode.quality] || episode.filename.indexOf("REPACK") !== -1) {
						episodes[e].torrents[episode.quality] = episode.torrent;
						logger.info('Added torrent to existing episode in '+ show.title);
					}
				}

				else {
					trakt.request('show', 'episode/summary', {title: show.tvdb_id, season: episode.season, episode: episode.episode}, function(err, data) {
						if(err) logger.error('Episode Error: '+ err);
						if(!err && data) {
							episodeData = data.episode;
							thisEpisode = {
								tvdb_id: episodeData.tvdb_id,
								season: episodeData.season,
								episode: episodeData.number,
								title: episodeData.title,
								overview: episodeData.overview,
								date_based: false,
								first_aired: episodeData.first_aired_utc,
								watched : {watched: false},
								torrents: []
		                    };
		                    thisEpisode.torrents = [];
		                    thisEpisode.torrents[0] = episode.torrent;
		                    thisEpisode.torrents[episode.quality] = episode.torrent;
		                    episodes.push(thisEpisode);
		                    logger.info(episodeData.title + ' added to : '+ show.title);
						}
						else {
							thisEpisode = {
								tvdb_id: '',
								season: episode.season,
								episode: episode.episode,
								title: 'Season ' + episode.season +', Episode '+ episode.episode,
								overview: '',
								date_based: false,
								first_aired: '',
								watched : {watched: false},
								torrents: []
		                    };
		                    thisEpisode.torrents = [];
		                    thisEpisode.torrents[0] = episode.torrent;
		                    thisEpisode.torrents[episode.quality] = episode.torrent;
		                    episodes.push(thisEpisode);
		                    logger.info('Blank episode added to : '+ show.title);
						}
					});
				}
				Show.update({imdb_id: doc.imdb_id}, {$set: {episodes: episodes}}, function(err, doc){
					return callback(null, episode);
				});
		    });
		}
	});

  },


}

module.exports = helpers;

// trakt error catcher
trakt.on('error', function(err){
  logger.error(err);
});
