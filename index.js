const http = require('http');
const path = require('path');
const chokidar = require('chokidar');
const {Server: WebSocketServer} = require('ws');
const console = require('j1/console');
const isArray = require('j1/isArray');
const promisify = require('j1/promisify');

const staticFile = require('./middleware/staticFile');
const watcher = require('./middleware/watcher');
const {SERVER_ERROR: HTTP_SERVER_ERROR} = require('./statusCodes');
const MAX_PORT_NUMBER = 0xffff;

class SableServer extends http.Server {

	constructor(config = {}) {
		super();
		this.console = console.create(config.console || 'SableServer');
		this.config = config;
		this.on('request', (...args) => {
			this.onRequest(...args);
		});
		this.resetConfig();
	}

	resetConfig() {
		this.config = Object.assign({
			port: 4000,
			chokidar: {}
		}, this.config);
		this.resetMiddlewares();
		this.resetDocumentRoot();
	}

	resetMiddlewares() {
		const {middlewares} = this.config;
		this.middlewares = [watcher];
		if (middlewares) {
			this.middlewares.push(...middlewares);
		}
		this.middlewares.push(staticFile);
	}

	resetDocumentRoot() {
		const {documentRoot} = this.config;
		this.documentRoot = [];
		if (isArray(documentRoot)) {
			this.documentRoot.push(...documentRoot);
		} else if (documentRoot) {
			this.documentRoot.push(documentRoot);
		}
		if (this.documentRoot.length === 0) {
			this.documentRoot.push(process.cwd());
		}
	}

	async startWebSocketServer() {
		const server = new SableServer({
			port: this.config.wsport || this.config.port + 1,
			console: 'SableWebSocketServer'
		});
		server.console.logLevel = server.console.LOGLEVEL_ERROR;
		await server.listen();
		const {port} = server.address();
		await server.close();
		return new Promise((resolve, reject) => {
			const wss = new WebSocketServer({port})
			.on('connection', () => {
				this.console.debug('connected');
			})
			.once('error', reject)
			.once('listening', () => {
				this.wss = wss;
				resolve();
			});
		});
	}

	startWatcher() {
		if (this.watcher) {
			this.watcher.close();
		}
		return new Promise((resolve, reject) => {
			this.watcher = chokidar.watch(this.documentRoot, Object.assign({
				ignoreInitial: true,
				awaitWriteFinish: {stabilityThreshold: 200},
				ignored: [
					/\/node_modules\//,
					/\/\.git\//
				]
			}, this.config.chokidar))
			.on('all', (event, file) => {
				this.console.info(event, file);
				const rootDir = this.documentRoot.find((dir) => {
					return file.startsWith(dir);
				});
				const pathname = path.relative(rootDir, file)
				.split(path.sep)
				.join('/');
				switch (event) {
				case 'change':
					if (this.wss) {
						for (const client of this.wss.clients) {
							if (client.readyState === client.OPEN) {
								client.send(pathname);
							} else {
								console.error(`Client state is ${client.readyState}`);
							}
						}
					}
					break;
				default:
				}
			})
			.once('error', reject)
			.once('ready', resolve);
		});
	}

	listen(...args) {
		return new Promise((resolve, reject) => {
			const removeListener = () => {
				this.removeListener('listening', onListen);
				this.removeListener('error', onError);
			};
			function onListen() {
				this.console.debug(`listening ${this.address().port}`);
				removeListener();
				resolve(this);
			}
			function onError(error) {
				removeListener();
				switch (error && error.code) {
				case 'EADDRINUSE':
				case 'EACCES':
					if (error.port < MAX_PORT_NUMBER) {
						resolve(this.listen(error.port + 1));
					}
					break;
				default:
					reject(error);
				}
			}
			if (args.length === 0) {
				args.push(this.config.port);
			}
			this
			.once('listening', onListen)
			.once('error', onError);
			super.listen(...args);
		});
	}

	onRequest(req, res) {
		const middlewares = this.middlewares.slice();
		const next = () => {
			const middleware = middlewares.shift();
			if (middleware) {
				middleware.call(this, req, res, next);
			} else {
				res.statusCode = HTTP_SERVER_ERROR;
				res.end('No middlewares matched');
			}
		};
		next();
	}

	close() {
		if (this.watcher) {
			this.watcher.close();
		}
		if (this.wss) {
			this.wss.close();
		}
		return promisify(super.close, this)();
	}

	async start() {
		await this.listen();
		await Promise.all([
			this.startWatcher(),
			this.startWebSocketServer()
		]);
	}

}

module.exports = SableServer;
