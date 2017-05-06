const fs = require('fs');
const path = require('path');
const mime = require('j1/mime');
const waitStream = require('../../waitStream');

const {OK: HTTP_OK} = require('../../statusCodes');

function watcher({url}, res, next) {
	if (/^\/sable-\w+\.js$/.test(url)) {
		res.writeHead(HTTP_OK, {'Content-Type': mime('.js')});
		waitStream(fs.createReadStream(path.join(__dirname, url)).pipe(res));
		return;
	}
	next();
}

module.exports = watcher;
