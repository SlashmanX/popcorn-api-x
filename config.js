module.exports = {
	master: false,
	port: 5000,
	workers: 2,
	scrapeTime: '00 30 * * * *', // every hour on the half hour. just to make sure the hourlydump is there
	pageSize: 50,
	dbHosts: ['localhost']
}
