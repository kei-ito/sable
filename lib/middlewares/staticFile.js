const path = require('path');
const fs = require('fs');
const {PassThrough} = require('stream');
const {URL} = require('url');
const {promisify} = require('util');
const chalk = require('chalk');
const ws = require('ws');
const chokidar = require('chokidar');
const {contentTypes, Injector, writeFileToStream} = require('../util.js');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const autoReloadScriptPath = path.join(__dirname, 'autoReload.script.js');
const errorHandlerScriptPath = path.join(__dirname, 'handleError.script.js');
exports.staticFile = ({
	documentRoot = process.cwd(),
	baseURL = 'http://localhost',
	indexFile = 'index.html',
	autoReloadScriptURL = 'autoreload.js',
	wss: wssParams,
	chokidar: chokidarOptions = {},
	silent = false,
} = {}) => {
	autoReloadScriptURL = autoReloadScriptURL.replace(/^\/*/, '/');
	chokidarOptions.ignoreInitial = true;
	chokidarOptions.awaitWriteFinish = {
		stabilityThreshold: 400,
		pollInterval: 200,
	};
	const watcher = chokidar.watch(documentRoot, chokidarOptions)
	.on('all', (event, file) => {
		const data = JSON.stringify({event, file});
		for (const client of wss.clients) {
			client.send(data);
		}
	});
	const wss = new ws.Server(wssParams);
	class SnippetInjector extends Injector {
		constructor() {
			super({
				pattern: /<!doctype\s+html\s*>\s*/,
				data: `<script src="${autoReloadScriptURL}" async></script>\n`,
			});
		}
	}
	const redirectToIndex = (req, res) => {
		res.statusCode = 301;
		res.writeHead(301, {Location: `${req.url}/`});
		res.end();
	};
	const respondFile = (res, filePath) => {
		const type = contentTypes.get(filePath);
		res.writeHead(200, {'Content-Type': type});
		if (type.startsWith('text/html')) {
			fs.createReadStream(filePath).pipe(new SnippetInjector()).pipe(res);
		} else {
			fs.createReadStream(filePath).pipe(res);
		}
	};
	const respondIndex = async (res, url, directory) => {
		res.writeHead(200, {'Content-Type': contentTypes.get('index.html')});
		const writer = new PassThrough();
		writer.pipe(new SnippetInjector()).pipe(res);
		writer.write('<!doctype html>\n');
		writer.write('<meta charset="utf-8">\n');
		writer.write('<meta name="viewport" content="width=device-width initial-scale=1">\n');
		writer.write(`<title>${url}</title>\n`);
		writer.write('<script>\n');
		await writeFileToStream(writer, errorHandlerScriptPath);
		writer.write('</script>\n');
		writer.write(`<h1>${url}</h1>\n`);
		writer.write('<ul>\n');
		writer.write('<li><a href="..">..</a></li>\n');
		for (const name of await readdir(directory)) {
			writer.write(`<li><a href="${name}">${name}</a></li>\n`);
		}
		writer.write('</ul>\n');
		const now = new Date();
		writer.write(`<p><time datetime="${now.toISOString()}">${now}</time></p>\n`);
		writer.end();
	};
	const middleware = async (req, res) => {
		const {pathname} = new URL(req.url, baseURL);
		if (pathname === autoReloadScriptURL) {
			res.writeHead(200, {'Content-Type': contentTypes.get(autoReloadScriptPath)});
			res.write(`self.wsAddress = ${JSON.stringify(wss.address())};\n`);
			fs.createReadStream(autoReloadScriptPath).pipe(res);
		} else {
			const filePath = path.join(documentRoot, pathname.replace(/\/$/, `/${indexFile}`));
			const isIndex = filePath.endsWith(indexFile);
			try {
				const stats = await stat(filePath);
				if (stats.isDirectory()) {
					redirectToIndex(req, res);
				} else {
					respondFile(res, filePath);
				}
			} catch (error) {
				if (error.code === 'ENOENT') {
					if (isIndex) {
						respondIndex(res, req.url, filePath.slice(0, -indexFile.length - 1));
					} else {
						res.statusCode = 404;
						res.end();
					}
				} else {
					throw error;
				}
			}
		}
	};
	middleware.onStart = (server) => {
		server.wss = wss;
		if (!silent) {
			wss.on('connection', (ws, req) => {
				if (server.getVisitorId) {
					const {id} = server.getVisitorId(req);
					server.log(chalk.dim(`Connected: ${id}`));
					ws.on('close', () => {
						server.log(chalk.dim(`Disconnected: ${id}`));
					});
				}
			});
		}
	};
	middleware.onClose = async () => {
		watcher.close();
		await new Promise((resolve) => wss.close(resolve));
	};
	return middleware;
};
