const http = require('http');
const console = require('j1/console').create('SableServer');
const isArray = require('j1/isArray');

const staticFile = require('./middleware/staticFile');
const watcher = require('./middleware/watcher');
const MAX_PORT_NUMBER = 0xffff;

class SableServer extends http.Server {

	constructor(config = {}) {
		super();
		this.config = config;
		this.on('request', (...args) => {
			this.onRequest(...args);
		});
		this.resetConfig();
	}

	resetConfig() {
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

	listen(...args) {
		return new Promise((resolve, reject) => {
			const removeListener = () => {
				this.removeListener('listening', onListen);
				this.removeListener('error', onError);
			};
			function onListen() {
				console.debug(`listening ${this.address().port}`);
				removeListener();
				resolve();
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
				res.statusCode = 500;
				res.end('No middlewares matched');
			}
		};
		next();
	}

}

module.exports = SableServer;
