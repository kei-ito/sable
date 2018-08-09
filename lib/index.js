const http = require('http');
const utilities = require('./util.js');
const {SableServer} = require('./SableServer.js');
const {staticFile} = require('./middlewares/staticFile.js');
const {logVisitor} = require('./middlewares/logVisitor.js');
const startServer = async ({
	documentRoot,
	server = http.createServer(),
	port = 4000,
	wsport = port + 1,
	wss = {port: wsport},
	base = 'http://localhost',
	index = 'index.html',
	reloadscript = 'autoreload.js',
	stdout = process.stdout,
	stderr = process.stderr,
	silent,
	middlewares = [
		logVisitor({
			silent,
		}),
		staticFile({
			documentRoot,
			base,
			wss,
			index,
			reloadscript,
			silent,
		}),
	],
}) => {
	if (!server.address()) {
		await utilities.listen(server, port);
	}
	const sableServer = new SableServer({
		server,
		middlewares,
		stdout,
		stderr,
	});
	sableServer.log(sableServer.server.address());
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
