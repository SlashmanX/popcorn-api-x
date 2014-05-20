var Show = require('../models/Show')

module.exports = function(server){

    server.get('/shows/update/:since', function(req, res) {
        var since = req.params.since;

        Show.count({last_updated : {$gt: parseInt(since)},num_seasons: { $gt: 0 }}, function (err, count) {
          
          // how many page?
          var nbPage = Math.round(count / server.appConfig.byPage);
          var docs = [];
          for (var i = 1; i < nbPage+1; i++)
              docs.push("shows/update/"+since+"/"+i);
                   
          res.json(202, docs);

        });

    })

  server.get('/shows/updated/:since', function(req, res) {
      var since = req.params.since;
      Show.find({last_updated : {$gt: parseInt(since)},num_seasons: { $gt: 0 }}, function(err, docs) {
          res.json(202, docs);
      })
  });
  
    server.get('/shows/update/:since/:page', function(req, res) {
        var page = req.params.page-1;   
        var offset = page*server.appConfig.byPage;      
        var since = req.params.since;

        Show.find({last_updated : {$gt: parseInt(since)},num_seasons: { $gt: 0 }}).sort({ title: -1 }).skip(offset).limit(server.appConfig.byPage).exec(function (err, docs) {
          res.json(202, docs);
        });

    });

    server.get('/shows/last_updated', function(req, res) { 
        Show.find({num_seasons: { $gt: 0 }}).sort({ last_updated: -1 }).limit(server.appConfig.byPage).exec(function (err, docs) {
          res.json(202, docs);
        });
    });

    server.get('/shows/last_updated/:page', function(req, res) {
        var page = req.params.page-1;   
        var offset = page*server.appConfig.byPage;
        Show.find({num_seasons: { $gt: 0 }}).sort({ last_updated: -1 }).skip(offset).limit(server.appConfig.byPage).exec(function (err, docs) {
          res.json(202, docs);
        });
    });

    server.get('/shows/search/:search/:page', function(req, res) {
        var page = req.params.page-1;
        var offset = page*server.appConfig.byPage;    
        var keywords = new RegExp(req.params.search.toLowerCase(),"gi");
        Show.find({title: keywords,num_seasons: { $gt: 0 }}).sort({ title: -1 }).skip(offset).limit(server.appConfig.byPage).exec(function (err, docs) {
          res.json(202, docs);
        });
    });

    server.get('/shows/search/:search', function(req, res) {
        var keywords = new RegExp(req.params.search.toLowerCase(),"gi");
        Show.find({title: keywords,num_seasons: { $gt: 0 }}).sort({ title: -1 }).limit(server.appConfig.byPage).exec(function (err, docs) {
          res.json(202, docs);
        });
    });    

}
