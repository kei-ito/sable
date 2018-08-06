const {inspect} = require('util');
const {getType, close} = require('./util.js');

class SableServer {

	static create(options) {
		return new this(options);
	}

	constructor({
		server,
		middlewares,
		stdout,
		stderr,
	}) {
		if (!server || getType(server.on) !== 'function') {
			const error = new Error('server.on is not a function');
			error.code = 'ENOSERVER';
			throw error;
		}
		this.server = server;
		this.middlewares = middlewares || [];
		this.stdout = stdout || process.stdout;
		this.stderr = stderr || process.stderr;
		server.on('request', (req, res) => this.onRequest(req, res));
	}

	log(...args) {
		for (const arg of args) {
			const type = getType(arg);
			if (type.endsWith('error')) {
				this.stderr.write(`${arg.stack || arg}\n`);
			} else {
				switch (type) {
				case 'undefined':
				case 'null':
				case 'number':
				case 'string':
					this.stdout.write(`${arg}\n`);
					break;
				default:
					this.stdout.write(`${inspect(arg)}\n`);
				}
			}
		}
	}

	onRequest(req, res) {
		const middlewares = this.middlewares.slice();
		const next = () => {
			Promise.resolve()
			.then(() => {
				const middleware = middlewares.shift();
				if (!middleware) {
					const error = new Error('No middleware');
					error.code = 'ENOMIDDLEWARE';
					throw error;
				}
				return middleware(req, res, next, this);
			})
			.catch((error) => this.log(error));
		};
		next();
	}

	async close() {
		await Promise.all(this.middlewares.map((middleware) => middleware.onClose && middleware.onClose()));
		await close(this.server);
	}

}

Object.assign(exports, {SableServer});
