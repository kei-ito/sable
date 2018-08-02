const {inspect} = require('util');
const {getType} = require('../util.js');

class SableServer {

	constructor({
		server,
		middlewares,
		stdout = process.stdout,
		stderr = process.stderr,
	}) {
		this.server = server;
		this.middlewares = middlewares;
		this.stdout = stdout;
		this.stderr = stderr;
		server.on('request', (req, res) => this.onRequest(req, res));
	}

	log(...args) {
		for (const arg of args) {
			if (getType(arg).endsWith('error')) {
				this.stderror.write(`${arg.stack || arg}\n`);
			} else {
				this.stdout.write(`${inspect(arg)}\n`);
			}
		}
	}

	onRequest(req, res) {
		const middlewares = this.middlewares.slice();
		const next = () => {
			const middleware = middlewares.shift();
			Promise.resolve()
			.then(() => middleware(req, res, next, this))
			.catch((error) => this.log(error));
		};
		next();
	}

}

Object.assign(exports, {SableServer});
