const http = require('http');
const console = require('j1/console').create('SableServer');

const MAX_PORT_NUMBER = 0xffff;

class SableServer extends http.Server {

	constructor(config) {
		super();
		this.config = config;
		this.middlewares = [];
		if (config.middlewares) {
			this.middlewares.push(...config.middlewares);
		}
		this.on('request', (...args) => {
			this.onRequest(...args);
		});
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
			this
			.once('listening', onListen)
			.once('error', onError);
			super.listen(...args);
		});
	}

	onRequest(req, res) {
		const middlewares = this.middlewares.slice();
		function next() {
			const middleware = middlewares.shift();
			if (middleware) {
				middleware.call(this, req, res, next);
			} else {
				res.statusCode = 500;
				res.end('No middlewares matched');
			}
		}
		next();
	}

}

module.exports = SableServer;
