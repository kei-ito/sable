const http = require('http');

function request(server, path) {
	return new Promise((resolve, reject) => {
		http.request({
			host: '127.0.0.1',
			port: server.address().port,
			path,
		})
		.once('error', reject)
		.once('response', resolve)
		.end();
	});
}

module.exports = request;
