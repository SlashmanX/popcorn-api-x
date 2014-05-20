# popocorn-api

Scrape torrents from eztv and generate a local database accessible with an api compatible with popcorn time.

#### Official API Endpoint
	http://popcorn-api.com
	http://popcorn-api.net

## Requirements
* node.js
* mongodb

## Installation

* `npm install`
* `node app.js`

## Sample Usage

We automatically generate the DB on start and we resync with eztv everyday at 00:00

### API route used in latest Popcorn Time (0.3.1+)

#### View all shows
 	http://localhost:5000/shows (return all pages)
 	http://localhost:5000/shows/[page]

#### Show detail
  http://localhost:5000/show/[imdb_id]