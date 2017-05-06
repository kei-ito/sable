const {PassThrough} = require('stream');
const vm = require('vm');
const path = require('path');
const fs = require('fs');
const url = require('url');
const console = require('j1/console').create('staticFile');
const promisify = require('j1/promisify');
const fileSize = require('j1/fileSize');
const formatDate = require('j1/formatDate');
const mime = require('j1/mime');
const stat = promisify(fs.stat, fs);
const readdir = promisify(fs.readdir, fs);
const readFile = promisify(fs.readFile, fs);

const SnippetInjector = require('../../SnippetInjector');
const waitStream = require('../../waitStream');
const {
	OK: HTTP_OK,
	MOVED_PERMANENTLY: HTTP_MOVED_PERMANENTLY,
	NOT_FOUND: HTTP_NOT_FOUND,
	SERVER_ERROR: HTTP_SERVER_ERROR
} = require('../../statusCodes');

function staticFile(req, res) {
	const pathname = url.parse(req.url).pathname.replace(/\/$/, '/index.html');
	console.debug(req.url);
	return [
		...this.documentRoot
		.map((documentRoot) => {
			return async () => {
				const filePath = path.join(documentRoot, pathname);
				const stats = await stat(filePath);
				if (stats.isFile()) {
					const contentType = mime(filePath);
					const injectSnippet = (/text\/html/).test(contentType) && this.wss;
					res.writeHead(HTTP_OK, {'Content-Type': contentType});
					await waitStream(
						fs.createReadStream(filePath)
						.pipe(injectSnippet ? new SnippetInjector({
							encoding: 'utf8',
							wsport: this.wss.options.port
						}) : new PassThrough())
						.pipe(res)
					);
				} else if (stats.isDirectory()) {
					const parsed = url.parse(req.url);
					parsed.pathname += '/';
					res.writeHead(HTTP_MOVED_PERMANENTLY, {Location: url.format(parsed)});
					res.end();
				}
			};
		}),
		...(/index\.html$/.test(pathname) ? this.documentRoot.map((documentRoot) => {
			return async () => {
				const dirPath = path.join(documentRoot, path.dirname(pathname));
				const dateFormat = '%YYYY-%MM-%DD %hh:%mm:%ss';
				const [rows, template] = await Promise.all([
					await Promise.all(
						[null, '..', ...await readdir(dirPath)]
						.map(async (filename, index) => {
							const {
								atime,
								birthtime,
								size
							} = 0 < index && await stat(path.join(dirPath, filename));
							const cols = 0 < index ? [
								`<a href="${filename}">${filename}</a>`,
								formatDate(atime, dateFormat),
								formatDate(birthtime, dateFormat),
								fileSize(size) || ''
							] : [
								'name',
								'last accessed',
								'birthtime',
								'size'
							];
							const tag = 0 < index ? 'td' : 'th';
							return `\t<tr>${cols.map((text) => {
								return `<${tag}>${text}</${tag}>`;
							}).join('')}</tr>`;
						})
					),
					readFile(path.join(__dirname, 'template.html'), 'utf8')
				]);
				res.end(template.replace(/\{\{\s*([\w-.]+)\s*\}\}/g, (match, expression) => {
					const context = {
						rows: rows.join(''),
						now: formatDate(new Date(), dateFormat)
					};
					vm.runInNewContext(`result = ${expression};`, context);
					return context.result || match;
				}));
			};
		}) : []),
		() => {
			res.statusCode = HTTP_NOT_FOUND;
			res.end(`Not Found: ${req.url}`);
		}
	]
	.reduce(async (promise, middleware) => {
		try {
			await promise;
			if (res.finished) {
				return;
			}
			await middleware();
		} catch (error) {
			if (!error || error.code !== 'ENOENT') {
				console.error(error);
				res.statusCode = HTTP_SERVER_ERROR;
				res.end(error ? error.message : null);
			}
		}
	}, Promise.resolve());
}

module.exports = staticFile;
