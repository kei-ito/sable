const path = require('path');
const {Server} = require('http');
const console = require('console');
const chalk = require('chalk');
const chokidar = require('chokidar');
const {Server: WebSocketServer} = require('ws');
const {ContentType} = require('@nlib/content-type');
const {listen} = require('../listen');
const {close} = require('../close');
const {getMsFromHrTime} = require('../get-ms-from-hrtime');
const {staticFile} = require('../middleware-static-file');
const {sableScript} = require('../middleware-sable-script');

exports.SableServer = class SableServer extends Server {

	constructor(config = {}) {
		switch (typeof config.documentRoot) {
		case 'string':
			config.documentRoot = [config.documentRoot];
			break;
		case 'object':
			config.documentRoot = [...config.documentRoot];
			break;
		default:
			config.documentRoot = [];
		}
		if (config.documentRoot.length === 0) {
			config.documentRoot.push(process.cwd());
		}
		config.documentRoot = config.documentRoot
		.map((directory) => path.isAbsolute(directory) ? directory : path.join(process.cwd(), directory));
		Object.assign(
			super(),
			{
				contentType: new ContentType(config.contentType),
				documentRoot: config.documentRoot,
				middlewares: [sableScript, ...(config.middlewares || []), staticFile],
				timeout: config.timeout || 10000,
				config,
				count: 0,
			}
		);
	}

	get wsPort() {
		return this.wss ? this.wss.address().port : null;
	}

	onRequest(req, res) {
		const label = `#${this.count++} ${req.method} ${req.url}`;
		req.startedAt = process.hrtime();
		const timer = setInterval(() => {
			const elapsed = getMsFromHrTime(req.startedAt);
			console.log(`pending (${elapsed}ms): ${label}`);
			if (this.timeout < elapsed) {
				res.emit('error', new Error(`Timeout of ${this.timeout}ms exceeded`));
			}
		}, 1000);
		res
		.once('error', (error) => {
			clearInterval(timer);
			console.error(error);
			if (res.writable) {
				res.statusCode = 500;
				res.end(`${error}`);
			}
		})
		.once('finish', () => {
			clearInterval(timer);
			console.log(chalk.dim(`${label} → ${res.statusCode} (${getMsFromHrTime(req.startedAt)}ms)`));
		});
		const middlewares = this.middlewares.slice();
		const next = () => {
			const middleware = middlewares.shift();
			if (middleware) {
				Promise.resolve()
				.then(() => middleware(req, res, next, this))
				.catch((error) => res.emit('error', error));
			} else {
				res.emit('error', new Error('No middleware matched'));
			}
		};
		next();
	}

	close(callback) {
		if (this.watcher) {
			this.watcher.close();
		}
		Promise.all([
			this.wss && close(this.wss),
			new Promise((resolve, reject) => {
				this.once('error', reject);
				super.close((error) => {
					this.removeListener('error', reject);
					if (error) {
						console.log('error@close', error);
						reject(error);
					} else {
						resolve();
					}
				});
			}),
		]).then(() => callback(), callback);
	}

	start(...args) {
		return listen(this, ...args)
		.then(() => Promise.all([
			this.startWebSocketServer(),
			this.startWatcher(),
		]))
		.then(() => this.on('request', this.onRequest.bind(this)));
	}

	startWebSocketServer(options) {
		if (this.wss) {
			return Promise.resolve(this.wss);
		}
		options = Object.assign(
			{port: this.address().port + 1},
			options || this.config.ws
		);
		const server = options.server || new Server();
		return (
			options.server
			? Promise.resolve(options)
			: listen(new Server(), options)
			.then((server) => {
				options.port = server.address().port;
				return close(server).then(() => options);
			})
		)
		.then((options) => {
			this.wss = new WebSocketServer(options);
		})
		.catch((error) => {
			error.server = server;
			throw error;
		});
	}

	startWatcher(options) {
		if (this.watcher) {
			return Promise.resolve(this.watcher);
		}
		options = Object.assign(
			{
				ignoreInitial: true,
				awaitWriteFinish: {stabilityThreshold: 200},
				ignored: [
					'**/node_modules/**/*',
					'**/.git/**/*',
				],
			},
			options || this.config.chokidar
		);
		return new Promise((resolve, reject) => {
			const watcher = chokidar.watch(this.documentRoot, options)
			.on('all', (event, filePath) => {
				console.log(`${event} ${filePath}`);
				this.onChange(filePath);
			})
			.once('error', reject)
			.once('ready', () => {
				this.watcher = watcher;
				resolve(watcher);
			});
		});
	}

	onChange(filePath) {
		const documentRoot = this.documentRoot.find((directory) => filePath.startsWith(directory));
		const pathname = `/${path.relative(documentRoot, filePath).split(path.sep).join('/')}`;
		this.sendMessage(pathname);
	}

	sendMessage(message) {
		if (!this.wss) {
			return;
		}
		for (const client of this.wss.clients) {
			if (client.readyState === client.OPEN) {
				client.send(message);
			}
		}
	}

	nextRequest(filter) {
		return new Promise((resolve) => {
			this.once('request', (req, res) => {
				if (!filter || filter({req, res})) {
					resolve({req, res});
				}
			});
		});
	}

	nextResponse(resFilter, reqFilter) {
		return this.nextRequest(reqFilter).then(({req, res}) => {
			return new Promise((resolve, reject) => {
				res
				.once('error', reject)
				.once('finish', () => {
					if (!resFilter || resFilter({req, res})) {
						resolve({req, res});
					}
				});
			});
		});
	}

	nextWebSocketConnection(filter) {
		return new Promise((resolve) => {
			this.wss.once('connection', (client, req) => {
				if (!filter || filter({client, req})) {
					resolve({client, req});
				}
			});
		});
	}

};
