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
	indexFile = 'index.html',
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
			indexFile,
			reloadscript,
			silent,
		}),
	],
	transformOptions,
}) => {
	if (!server.address()) {
		await utilities.listen(server, port);
	}
	const options = {
		server,
		middlewares,
		stdout,
		stderr,
	};
	if (transformOptions) {
		transformOptions(options);
	}
	const sableServer = new SableServer(options);
	sableServer.log('SableServer listening:', sableServer.server.address());
	return sableServer;
};
Object.assign(
	exports,
	utilities,
	{
		SableServer,
		middlewares: {
			staticFile,
			logVisitor,
		},
		startServer,
	}
);
