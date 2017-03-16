const path = require('path');
const fs = require('fs');
const url = require('url');
const promisify = require('j1/promisify');
const mime = require('j1/mime');
const stat = promisify(fs.stat, fs);
const SnippetInjector = require('../../SnippetInjector');

const HTTP_OK = 200;
const HTTP_MOVED_PERMANENTLY = 301;
const HTTP_NOT_FOUND = 404;

function getPathName(req) {
	const {pathname} = url.parse(req.url);
	return pathname.replace(/\/$/, '/index.html');
}

function respondFile(file, req, res, next) {
	stat(file)
	.then((stats) => {
		if (stats.isFile()) {
			const contentType = mime(file);
			switch (contentType.split(/\s*;\s*/)[0]) {
			case 'text/html':
				res.writeHead(HTTP_OK, {'Content-Type': contentType});
				fs.createReadStream(file)
					.pipe(new SnippetInjector({
						encoding: 'utf8',
						wsport: this.wss.options.port
					}))
					.pipe(res);
				break;
			default:
				res.writeHead(HTTP_OK, {
					'Content-Length': `${stats.size}`,
					'Content-Type': contentType
				});
				fs.createReadStream(file).pipe(res);
			}
		} else if (stats.isDirectory()) {
			const parsed = url.parse(req.url);
			parsed.pathname += '/';
			res.writeHead(HTTP_MOVED_PERMANENTLY, {Location: url.format(parsed)});
			res.end();
		} else {
			next();
		}
	})
	.catch(next);
}

function staticFile(documentRoot) {
	return function (req, res, _next) {
		const pathname = getPathName(req);
		const middleware = documentRoot.map((dir) => {
			return (...args) => {
				respondFile.call(this, path.join(dir, pathname), ...args);
			};
		});
		function next(error = {}) {
			const fn = middleware.shift();
			if (fn) {
				fn(req, res, next, error);
			} else if (error.code === 'ENOENT') {
				if ((/\/index\.html$/).test(pathname)) {
					_next();
				} else {
					res.writeHead(HTTP_NOT_FOUND);
					res.end(`Not Found: ${req.url}`);
				}
			} else {
				_next();
			}
		}
		next();
	};
}

staticFile.respondFile = respondFile;

module.exports = staticFile;
