var Show = require('../models/Show')

module.exports = function(server){
	server.get('/echo/:name', function (req, res, next) {
		res.pjax = 'echo'
		res.send({name: req.params.name})
		return next()
	})

	server.get('/shows', function(req, res) {
      
      // we get how many elements we have
      // then we return the page array

      Show.count({}, function (err, count) {
        	
			var nbPage = Math.round(count / server.appConfig.byPage);
        	var docs = [];
        	for (var i = 1; i < nbPage+1; i++)
        		docs.push("shows/"+i);
                 
    		res.json(202, docs);

    	});

	});

  	server.get('/shows/:page', function(req, res) {
      var page = req.params.page-1;   
      var offset = page*server.appConfig.byPage;


      // support older version
      if (req.params.page == 'all') {

        Show.find({num_seasons: { $gt: 0 }}).sort({ title: -1 }).exec(function (err, docs) {
          res.json(202, docs);
        });  

      } else {

        var query = {num_seasons: { $gt: 0 }};
        var sort = {"rating.votes": -1, "rating.percentage": -1}
        // filter elements
        var data = req.query;

        if (data.keywords) {
          var words = data.keywords.split("%20");
          var regex = data.keywords.toLowerCase();
          if(words.length > 1) {
            var regex = "^";
            for(var w in words) {
              regex += "(?=.*\\b"+words[w].toLowerCase()+"\\b)";
            }
            regex += ".+";
          }
          query = {title: new RegExp(regex,"gi"),num_seasons: { $gt: 0 }};
        }

        if (data.sort) {
          if(data.sort == "year") sort = {year: -1};
          if(data.sort == "updated") sort = {last_updated: -1};
          if(data.sort == "name") sort = {title: 1};
        }

        if(data.genre && data.genre != "All") {
          query = {genres : data.genre,num_seasons: { $gt: 0 }}
        }

        // paging
        Show.find(query,{ _id: 1, imdb_id: 1, tvdb_id:1, title:1, year:1, images:1, slug:1, num_seasons:1, last_updated:1 }).sort(sort).skip(offset).limit(byPage).exec(function (err, docs) {
          res.json(202, docs);
        });

      }

  	});	

}
