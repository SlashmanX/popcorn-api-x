module.exports = {
	master: false,
	port: 5000,
	workers: 2,
	scrapeTime: '00 00 3,15 * * *',
	pageSize: 50,
	dbHosts: [
		'fr.ptnet',
		'us-chi.ptnet',
		'us-mia.ptnet',
		'us-dal.ptnet'
	]
}