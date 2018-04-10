exports.listen = function listen(server, ...args) {
	const options = {};
	return new Promise((resolve, reject) => {
		if (args.length === 0) {
			args.push(...[].concat(server.config.listen || 4000));
		}
		const callback = args.pop();
		if (typeof callback !== 'function') {
			args.push(callback);
		}
		switch (typeof args[0]) {
		case 'object':
			Object.assign(options, args[0]);
			break;
		case 'number':
			[options.port, options.host, options.backlog] = args;
			break;
		case 'string':
			[options.path, options.backlog] = args;
			break;
		default:
		}
		server
		.once('error', reject)
		.listen(...args, () => {
			server.removeListener('error', reject);
			resolve(server);
		});
	})
	.catch((error) => {
		let nextPort;
		switch (error.code) {
		case 'EADDRINUSE':
		case 'EACCES':
			nextPort = error.port + 1;
			break;
		default:
			nextPort = 0;
		}
		if (0 < nextPort) {
			options.port = nextPort;
			return listen(server, options);
		} else {
			throw error;
		}
	});
};
