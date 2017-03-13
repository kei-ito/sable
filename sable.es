const http = require('http');
const path = require('path');
const console = require('j1/console').create('sable');
const isString = require('j1/isString');
const promisify = require('j1/promisify');
const listen = require('j1/listen');
const chokidar = require('chokidar');
const {Server: WebSocketServer} = require('ws');

const middlewareWatcher = require('./middleware/watcher');
const middlewareStaticFile = require('./middleware/staticFile');
const middlewareIndex = require('./middleware/index');
const middlewareError = require('./middleware/error');

const DEFAULT_PORT = 4000;
const DEFAULT_WSPORT_OFFSET = 100;

function startHTTPServer(port) {
	return listen(http.createServer(), port);
}

function startWebSocketServer(port) {
	let availablePort = port;
	return listen(http.createServer(), port)
	.then((server) => {
		({port: availablePort} = server.address());
		return promisify(server.close, server)();
	})
	.then(() => {
		return new WebSocketServer({port: availablePort});
	});
}

function startWatcher(documentRoot, options = {}) {
	console.debug(`watching: ${documentRoot}`);
	options.ignoreInitial = true;
	options.ignored = /[/\\]\.|node_modules/;
	options.awaitWriteFinish = {stabilityThreshold: 100};
	return chokidar.watch(documentRoot, options);
}

function sable({
	port = DEFAULT_PORT,
	wsport = port + DEFAULT_WSPORT_OFFSET,
	documentRoot = process.cwd(),
	chokidar: chokidarOption,
	middleware = []
}) {
	if (isString(documentRoot)) {
		documentRoot = [documentRoot];
	}
	if (documentRoot.length < 1) {
		documentRoot.push(process.cwd());
	}
	documentRoot = documentRoot.map((dir) => {
		if (!path.isAbsolute(dir)) {
			dir = path.join(process.cwd(), dir);
		}
		return dir;
	});
	return Promise.all([
		startHTTPServer(port),
		startWebSocketServer(wsport),
		startWatcher(documentRoot, chokidarOption)
	])
	.then(([server, wss, watcher]) => {
		const getId = (() => {
			let count = 0;
			return () => {
				count += 1;
				return count;
			};
		})();
		watcher
			.on('error', console.onError)
			.on('all', function (event, file) {
				const matchedRoot = documentRoot.find((dir) => {
					return file.startsWith(dir);
				});
				const relativePath = `/${
					path.relative(matchedRoot, file)
					.split(path.sep)
					.join('/')
				}`;
				switch (event) {
				case 'add':
				case 'change':
					console.info(event, file);
					wss.clients.forEach((client) => {
						client.send(relativePath);
					});
					break;
				default:
				}
			});
		server
			.on('error', console.onError)
			.on('request', function (req, res) {
				const id = getId();
				const middlewareList = middleware.slice();
				function next() {
					middlewareList.shift().call(server, req, res, next);
				}
				console.debug(id, req.method, req.url);
				res
					.on('finish', function () {
						const {statusCode, statusMessage} = res;
						console.debug(id, statusCode, statusMessage, req.url);
					});
				next();
			});
		server.wss = wss;
		middleware.push(middlewareWatcher());
		middleware.push(middlewareStaticFile(documentRoot));
		middleware.push(middlewareIndex(documentRoot));
		middleware.push(middlewareError());
	})
	.catch(console.onError);
}

module.exports = sable;
