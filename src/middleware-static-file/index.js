const path = require('path');
const {asyncForEach} = require('../async-for-each');
const {indexPage} = require('./index-page');
const {serveFile} = require('./serve-file');

exports.staticFile = function staticFile(req, res, next, server) {
	const {pathname} = req.parsedURL;
	return asyncForEach(server.documentRoot, (directory, index, directories, next) => {
		const filePath = path.join(directory, ...pathname.split('/'));
		return (pathname.endsWith('/') ? indexPage : serveFile)(filePath, req, res, server)
		.catch((error) => {
			if (error && error.code === 'ENOENT') {
				return next();
			}
			throw error;
		});
	})
	.then(() => {
		if (!res.finished) {
			res.statusCode = 404;
			res.end();
		}
	});
};
