const fs = require('fs');
const path = require('path');
const ws = require('ws');
const chokidar = require('chokidar');
const {contentTypes} = require('../util.js');
const scriptPath = path.join(__dirname, 'sableSync.script.js');
exports.hookunSync = ({
	wss,
	chokidar: chokidarArgs,
}) => {
	wss = new ws.Server({server: wss});
	chokidar.watch(...chokidarArgs)
	.on('all', (event, file) => {
		const data = JSON.stringify({event, file});
		for (const client of wss.clients) {
			client.send(data);
		}
	});
	return (req, res, next) => {
		if (req.url === '/sableSync.js') {
			res.writeHead(200, {'Content-Type': contentTypes.get(scriptPath)});
			res.write(`self.wsAddress = ${JSON.stringify(wss.address())};\n`);
			fs.createReadStream(scriptPath).pipe(res);
		} else {
			next();
		}
	};
};
