var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var showSchema = new Schema({
	_id: { type: String, required: true, index: { unique: true } },
    imdb_id: String,
    tvdb_id: String,
    title: String,
    year: String,
    images: {},
    slug: String,
    synopsis: String,
    runtime: String,
    rating: {},
    genres: [],
    country: String,
    network: String,
    air_day: String,
    air_time: String,
    status: String,
    num_seasons: Number,
    episodes: [],
    last_updated: Number
});

module.exports = mongoose.model('Show', showSchema);
