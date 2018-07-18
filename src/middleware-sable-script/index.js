const fs = require('fs');
const path = require('path');
exports.sableScript = ({url}, res, next) => {
	if (url.endsWith('sable-script.js')) {
		res.writeHead(200, {'Content-Type': 'application/javascript'});
		fs.createReadStream(path.join(__dirname, 'src', 'index.js'))
		.pipe(res);
	} else {
		next();
	}
};
