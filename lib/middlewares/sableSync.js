const fs = require('fs');
const path = require('path');
const ws = require('ws');
const chokidar = require('chokidar');
const {contentTypes} = require('../util.js');
const scriptPath = path.join(__dirname, 'sableSync.script.js');
exports.sableSync = ({
	wss: wssParams,
	chokidar: chokidarArgs = [process.cwd()],
	pattern = /^\/sableSync\.js$/,
}) => {
	const wss = new ws.Server(wssParams);
	const watcher = chokidar.watch(...chokidarArgs)
	.on('all', (event, file) => {
		const data = JSON.stringify({event, file});
		for (const client of wss.clients) {
			client.send(data);
		}
	});
	const middleware = (req, res, next) => {
		if (pattern.test(req.url)) {
			res.writeHead(200, {'Content-Type': contentTypes.get(scriptPath)});
			res.write(`self.wsAddress = ${JSON.stringify(wss.address())};\n`);
			fs.createReadStream(scriptPath).pipe(res);
		} else {
			next();
		}
	};
	middleware.onClose = async () => {
		watcher.close();
		await new Promise((resolve) => wss.close(resolve));
	};
	return middleware;
};
