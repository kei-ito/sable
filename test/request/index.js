const http = require('http');

function request(server, path) {
	return new Promise((resolve, reject) => {
		http.request({
			port: server.address().port,
			path,
		})
		.once('error', reject)
		.once('response', resolve)
		.end();
	});
}

module.exports = request;
