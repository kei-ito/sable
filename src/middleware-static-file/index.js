const path = require('path');
const {indexPage} = require('./index-page');
const {serveFile} = require('./serve-file');

exports.staticFile = async function staticFile(req, res, next, server) {
	const {pathname} = req.parsedURL;
	for (const directory of server.documentRoot) {
		const filePath = path.join(directory, ...pathname.split('/'));
		try {
			await (pathname.endsWith('/') ? indexPage : serveFile)(filePath, req, res, server);
			return;
		} catch (error) {
			if (!(error && error.code === 'ENOENT')) {
				res.statusCode = 500;
				res.end();
				return;
			}
		}
	}
	res.statusCode = 404;
	res.end();
};
