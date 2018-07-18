const listen = exports.listen = async (server, ...args) => {
	const options = {};
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
	try {
		await new Promise((resolve, reject) => {
			server
			.once('error', reject)
			.listen(...args, () => {
				server.removeListener('error', reject);
				resolve();
			});
		});
	} catch (error) {
		let nextPort = 0;
		switch (error.code) {
		case 'EADDRINUSE':
		case 'EACCES':
			nextPort = error.port + 1;
			break;
		default:
		}
		if (0 < nextPort) {
			options.port = nextPort;
			return listen(server, options);
		} else {
			throw error;
		}
	}
	return server;
};
