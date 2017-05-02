const path = require('path');
const {respondFile} = require('../staticFile');

function watcher(req, res, next) {
	if (req.url === '/sable-watcher.js') {
		respondFile(path.join(__dirname, 'sable-watcher.js'), req, res, next);
		return;
	}
	next();
}

module.exports = watcher;
