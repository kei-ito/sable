const fs = require('fs');
const url = require('url');
const promisify = require('@nlib/promisify');
const SnippetInjector = require('../../-snippet-injector');

const stat = promisify(fs.stat, fs);

module.exports = function serveFile(filePath, req, res, server) {
	return stat(filePath)
	.then((stats) => {
		if (stats.isDirectory()) {
			const newURL = Object.assign({}, req.parsedURL);
			newURL.pathname += '/';
			res.writeHead(301, {
				'location': url.format(newURL),
			});
			res.end();
			return undefined;
		} else {
			res.writeHead(200, {
				'content-type': server.contentType.get(filePath),
			});
			return new Promise((resolve, reject) => {
				fs.createReadStream(filePath)
				.pipe(new SnippetInjector(server))
				.pipe(res)
				.once('error', reject)
				.once('finish', resolve);
			});
		}
	});
};
