const url = require('url');
const fs = require('fs');
const path = require('path');
const mu = require('mu2');
const mime = require('j1/mime');
const console = require('j1/console').create('sable-index');
const promisify = require('j1/promisify');
const readdir = promisify(fs.readdir, fs);

const templatePath = path.join(__dirname, 'template.html');
const HTTP_OK = 200;

function respondFileList(dir, req, res, next) {
	readdir(dir)
	.then((files) => {
		files.unshift('..');
		res.writeHead(HTTP_OK, {'Content-Type': mime('index.html')});
		mu.clearCache();
		mu.compileAndRender(templatePath, {
			dir: url.parse(req.url).pathname,
			files: files.map((file) => {
				return {title: file};
			})
		}).pipe(res);
	})
	.catch((error) => {
		console.error(error);
		next();
	});
}

function index(documentRoot) {
	return function (req, res, _next) {
		const {pathname} = url.parse(req.url);
		const middleware = documentRoot.map((dir) => {
			return function (...args) {
				respondFileList(path.join(dir, pathname), ...args);
			};
		});
		function next(error = {}) {
			const fn = middleware.shift();
			if (fn) {
				fn(req, res, next, error);
			} else {
				_next();
			}
		}
		if ((/\/$/).test(pathname)) {
			next();
		} else {
			_next();
		}
	};
}

module.exports = index;
