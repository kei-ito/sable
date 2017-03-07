const path = require('path');
const fs = require('fs');
const console = require('j1/console').create('sable-staticFile');
const promisify = require('j1/promisify');
const mime = require('j1/mime');
const stat = promisify(fs.stat, fs);

const HTTP_OK = 200;
const HTTP_MOVED_PERMANENTLY = 301;

function respondFile(file, req, res, next) {
	stat(file)
	.then((stats) => {
		console.debug(file);
		if (stats.isFile()) {
			res.writeHead(HTTP_OK, {
				'Content-Length': `${stats.size}`,
				'Content-Type': mime(file)
			});
			fs.createReadStream(file).pipe(res);
		} else if (stats.isDirectory()) {
			res.writeHead(HTTP_MOVED_PERMANENTLY, {Location: `${req.url}/`});
		}
	})
	.catch(next);
}

function staticFile(documentRoot) {
	return function (_req, _res, _next) {
		const middleware = documentRoot.map((dir) => {
			return function (...args) {
				respondFile(path.join(dir, _req.url), ...args);
			};
		}).concat(_next);
		function next() {
			middleware.shift()(_req, _res, next);
		}
		next();
	};
}

module.exports = staticFile;
