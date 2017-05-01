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

const getId = (() => {
	let count = 0;
	return () => {
		count += 1;
		return count;
	};
})();

function sable({
	port = DEFAULT_PORT,
	wsport = port + DEFAULT_WSPORT_OFFSET,
	documentRoot = process.cwd(),
	chokidar: chokidarOption,
	middleware = [],
	noWatch = false,
	quiet = false
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
	const promise = Promise.all([
		startHTTPServer(port),
		noWatch ? null : startWebSocketServer(wsport),
		noWatch ? null : startWatcher(documentRoot, chokidarOption)
	])
	.then(function attachModules([server, wss, watcher]) {
		server.wss = wss;
		server.watcher = watcher;
		return server;
	})
	.then(function setClose(server) {
		const {wss, watcher} = server;
		function close() {
			if (watcher) {
				watcher.close();
			}
			return Promise.all([
				promisify(server.close, server)(),
				wss ? promisify(wss.close, wss)() : null
			]);
		}
		promise.close = close;
		server.on('close', close);
		return server;
	})
	.then(function setWatchers(server) {
		const {wss, watcher} = server;
		function onChange(file) {
			const matchedRoot = documentRoot.find((dir) => {
				return file.startsWith(dir);
			});
			const relativePath = `/${
				path.relative(matchedRoot, file)
				.split(path.sep)
				.join('/')
			}`;
			wss.clients.forEach((client) => {
				if (client.readyState === 1) {
					client.send(relativePath);
				}
			});
		}
		if (watcher) {
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
					if (!quiet) {
						console.info(event, relativePath);
					}
				})
				.on('add', onChange)
				.on('change', onChange);
		}
		return server;
	})
	.then(function setServers(server) {
		const {wss} = server;
		server
			.on('error', console.onError)
			.on('request', function (req, res) {
				const id = getId();
				const middlewareList = middleware.slice();
				function next() {
					middlewareList.shift().call(server, req, res, next);
				}
				if (!quiet) {
					console.debug(id, req.method, req.url);
				}
				res
					.on('finish', function () {
						const {statusCode, statusMessage} = res;
						if (!quiet) {
							console.debug(id, statusCode, statusMessage, req.url);
						}
					});
				next();
			});
		if (wss) {
			server.wss = wss;
			middleware.push(middlewareWatcher());
		}
		middleware.push(middlewareStaticFile(documentRoot));
		middleware.push(middlewareIndex(documentRoot));
		middleware.push(middlewareError());
		return server;
	});
	return promise;
}

module.exports = sable;
