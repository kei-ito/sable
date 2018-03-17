const fs = require('fs');
const path = require('path');

exports.sableScript = function sableScript({url}, res, next) {
	return url.endsWith('sable-script.js')
	? new Promise((resolve, reject) => {
		res.writeHead(200, {'Content-Type': 'application/javascript'});
		fs.createReadStream(path.join(__dirname, 'src', 'index.js'))
		.pipe(res)
		.once('error', reject)
		.once('finish', resolve);
	})
	: next();
};
