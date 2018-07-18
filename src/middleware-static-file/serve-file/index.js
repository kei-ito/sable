const fs = require('fs');
const url = require('url');
const {promisify} = require('util');
const {SnippetInjector} = require('../../-snippet-injector');
const stat = promisify(fs.stat);
exports.serveFile = async (filePath, req, res, server) => {
	const stats = await stat(filePath);
	if (stats.isDirectory()) {
		const newURL = Object.assign({}, req.parsedURL);
		newURL.pathname += '/';
		res.writeHead(301, {'location': url.format(newURL)});
		res.end();
		return;
	}
	const filter = server.config.injectSnippet || ((filePath) => (/\.html?/).test(filePath));
	if (filter(filePath)) {
		res.writeHead(200, {
			'content-type': server.contentType.get(filePath),
		});
		fs.createReadStream(filePath)
		.pipe(new SnippetInjector(server))
		.pipe(res);
	} else {
		res.writeHead(200, {
			'content-type': server.contentType.get(filePath),
			'content-length': `${stats.size}`,
		});
		fs.createReadStream(filePath)
		.pipe(res);
	}
};
