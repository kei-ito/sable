const path = require('path');
const url = require('url');
const {Server} = require('http');
const console = require('console');
const chalk = require('chalk');
const chokidar = require('chokidar');
const {Server: WebSocketServer} = require('ws');
const {ContentType} = require('@nlib/content-type');
const {listen} = require('../listen');
const {close} = require('../close');
const {staticFile} = require('../middleware-static-file');
const {sableScript} = require('../middleware-sable-script');
const {absolutify} = require('@nlib/util');

class SableServer {

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
		config.documentRoot = config.documentRoot.map((directory) => absolutify(directory));
		Object.assign(
			this,
			{
				server: config.server || new Server(),
				contentType: new ContentType(config.contentType),
				documentRoot: config.documentRoot,
				middlewares: [sableScript, ...(config.middlewares || []), staticFile],
				config,
				count: 0,
			}
		);
	}

	address() {
		return this.server.address();
	}

	once(...args) {
		this.server.once(...args);
		return this;
	}

	on(...args) {
		this.server.on(...args);
		return this;
	}

	removeListener(...args) {
		this.server.removeListener(...args);
		return this;
	}

	removeAllListeners(...args) {
		this.server.removeAllListeners(...args);
		return this;
	}

	get wsPort() {
		return this.wss ? this.wss.address().port : null;
	}

	getLabel(req) {
		return `#${this.count++} ${req.method} ${req.url}`;
	}

	filterRequest(req) {
		req.parsedURL = url.parse(req.url, true);
		req.startedAt = new Date();
		req.label = this.getLabel(req);
		return req;
	}

	onRequest(req, res) {
		this.filterRequest(req);
		const timer = setInterval(() => {
			const {config: {timeout = 10000}} = this;
			const elapsed = new Date() - req.startedAt;
			console.log(`pending (${elapsed}ms): ${req.label}`);
			if (timeout < elapsed) {
				res.emit('error', new Error(`Timeout of ${timeout}ms exceeded`));
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
			console.log(chalk.dim(`${req.label} → ${res.statusCode} (${new Date() - req.startedAt}ms)`));
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
			close(this.server),
		])
		.then(() => callback(), callback);
	}

	async start(...args) {
		await listen(this.server, ...(args || [].concat(this.config.listen || 4000)));
		await Promise.all([
			this.startWebSocketServer(),
			this.startWatcher(),
		]);
		this.server.on('request', this.onRequest.bind(this));
		return this;
	}

	async startWebSocketServer(options) {
		if (!this.wss) {
			options = Object.assign(
				{port: this.address().port + 1},
				options || this.config.ws
			);
			if (!options.server) {
				const server = await listen(new Server(), options);
				options.port = server.address().port;
				await close(server);
			}
			this.wss = new WebSocketServer(options);
		}
		return this.wss;
	}

	async startWatcher(options) {
		if (!this.watcher) {
			options = Object.assign(
				{
					ignoreInitial: true,
					awaitWriteFinish: {stabilityThreshold: 200},
					ignored: ['**/node_modules/**/*', '**/.git/**/*'],
				},
				options || this.config.chokidar
			);
			await new Promise((resolve, reject) => {
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
		return this.watcher;
	}

	onChange(filePath) {
		const documentRoot = this.documentRoot.find((directory) => filePath.startsWith(directory));
		const pathname = `/${path.relative(documentRoot, filePath).split(path.sep).join('/')}`;
		this.sendMessage(pathname);
	}

	sendMessage(message) {
		if (this.wss) {
			for (const client of this.wss.clients) {
				if (client.readyState === client.OPEN) {
					client.send(message);
				}
			}
		}
		return this;
	}

}

exports.SableServer = SableServer;
