const path = require('path');
const {Server} = require('http');
const console = require('console');
const chalk = require('chalk');
const chokidar = require('chokidar');
const {Server: WebSocketServer} = require('ws');
const getNextPort = require('./get-next-port');
const getMsFromHrtime = require('./get-ms-from-hrtime');
const staticFile = require('./middleware-static-file');
const sableScript = require('./middleware-sable-script');

function trueFn() {
	return true;
}

class SableServer extends Server {

	constructor(config = {}) {
		if (typeof config !== 'object') {
			throw new TypeError(`Config is not an object: ${typeof config}`);
		}
		super().config = config;
		this.count = 0;
		this.middlewares = [sableScript, ...(this.config.middlewares || []), staticFile];
		this.documentRoot = [].concat(config.documentRoot || process.cwd())
		.map((filePath) => {
			return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
		});
	}

	get wsPort() {
		return this.wss ? this.wss._server.address().port : null;
	}

	onRequest(req, res) {
		const label = `#${this.count++} ${req.method} ${req.url}`;
		req.startedAt = process.hrtime();
		const timer = setInterval(() => {
			console.log(`pending (${getMsFromHrtime(req.startedAt)}ms): ${label}`);
		}, 1000);
		const middlewares = this.middlewares.slice();
		const next = () => {
			const middleware = middlewares.shift();
			if (middleware) {
				return middleware(req, res, next, this);
			} else {
				res.statusCode = 501;
				res.end('No middlewares matched');
				return Promise.resolve();
			}
		};
		next()
		.catch((error) => {
			console.error(error);
			if (!res.finished) {
				res.statusCode = 500;
				res.end();
			}
		})
		.then(() => {
			clearInterval(timer);
			console.log(chalk.dim(`${label} → ${res.statusCode} (${getMsFromHrtime(req.startedAt)}ms)`));
		});
	}

	close() {
		if (this.watcher) {
			this.watcher.close();
		}
		if (this.wss) {
			this.wss.close();
		}
		return new Promise((resolve, reject) => {
			this
			.once('close', resolve)
			.once('error', reject);
			super.close();
		});
	}

	start(...args) {
		return this.listen(...args)
		.then(() => {
			this
			.on('request', this.onRequest.bind(this));
			return Promise.all([
				this.startWebSocketServer(),
				this.startWatcher(),
			]);
		})
		.then(() => {
			return this;
		});
	}

	listen(...args) {
		if (args.length === 0) {
			args.push(...[].concat(this.config.listen || 4000));
		}
		const callback = args.pop();
		if (typeof callback !== 'function') {
			args.push(callback);
		}
		const options = {};
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
		return new Promise((resolve, reject) => {
			const onError = (error) => {
				const nextPort = getNextPort(error);
				if (0 < nextPort) {
					options.port = nextPort;
					resolve(this.listen(options));
				} else {
					reject(error);
				}
			};
			super.listen(...args, () => {
				this.removeListener('error', onError);
				resolve(this);
			})
			.once('error', onError);
		});
	}

	startWebSocketServer(options) {
		if (this.wss) {
			return Promise.resolve(this.wss);
		}
		options = Object.assign(
			{port: this.address().port},
			options || this.config.ws
		);
		return new Promise((resolve, reject) => {
			const onError = (error) => {
				const nextPort = getNextPort(error);
				if (0 < nextPort) {
					options.port = nextPort;
					resolve(this.startWebSocketServer(options));
				} else {
					reject(error);
				}
			};
			const wss = new WebSocketServer(options, () => {
				wss.removeListener('error', onError);
				this.wss = wss;
				resolve(wss);
			})
			.on('connection', (client, req) => {
				console.log(chalk.dim(`connection: ${req.headers['user-agent']}`));
			})
			.once('error', onError);
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
					/node_modules/,
					/\.git/,
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
		const documentRoot = this.documentRoot
		.find((dir) => {
			return filePath.startsWith(dir);
		});
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

	nextRequest(filter = trueFn) {
		return new Promise((resolve) => {
			this
			.once('request', (req, res) => {
				if (filter({req, res})) {
					resolve({req, res});
				}
			});
		});
	}

	nextResponse(resFilter = trueFn, reqFilter = trueFn) {
		return this.nextRequest(reqFilter)
		.then(({req, res}) => {
			return new Promise((resolve, reject) => {
				res
				.once('error', reject)
				.once('finish', () => {
					if (resFilter({req, res})) {
						resolve({req, res});
					}
				});
			});
		});
	}

	nextWebSocketConnection(filter = trueFn) {
		return new Promise((resolve) => {
			this.wss
			.once('connection', (client, req) => {
				if (filter({client, req})) {
					resolve({client, req});
				}
			});
		});
	}

}

module.exports = SableServer;
