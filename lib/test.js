var kickass = require('./kickass');

var show = {};
show.name = "Archer (2009)";
show.slug = "archer-%282009%29-tv23354";

kickass.getAllShows(function(err, data) {
	console.log('Num Shows: '+ data.length);
});

kickass.getAllEpisodes(show, function(err, data) {
	console.log(data);
	delete data.dateBased;
	console.log('Seasons: ' + Object.keys(data).length);
})