const http = require('http');
const utilities = require('./util.js');
const {SableServer} = require('./SableServer.js');
const {staticFile} = require('./middlewares/staticFile.js');
const startServer = async ({
	server = http.createServer(),
	port = 4000,
	wsport = port + 1,
	wss = {port: wsport},
	base = 'http://localhost',
	index = 'index.html',
	reloadscript = 'autoreload.js',
	stdout = process.stdout,
	stderr = process.stderr,
	middlewares = [
		staticFile({
			base,
			wss,
			index,
			reloadscript,
		}),
	],
}) => {
	if (!server.address()) {
		await utilities.start(server, port);
	}
	const sableServer = new SableServer({
		server,
		middlewares,
		stdout,
		stderr,
	});
	return sableServer;
};
Object.assign(
	exports,
	utilities,
	{
		SableServer,
		middlewares: {staticFile},
		startServer,
	}
);
