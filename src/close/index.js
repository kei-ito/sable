exports.close = function close(server) {
	return new Promise((resolve, reject) => {
		if (!server.address()) {
			resolve();
		}
		server
		.once('error', reject)
		.close((error) => {
			server.removeListener('error', reject);
			if (error) {
				reject(error);
			} else {
				resolve();
			}
		});
	});
};
