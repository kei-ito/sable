const http = require('http');
const t = require('tap');
const {Logger, listen, waitResponse} = require('../lib/util.js');
const {SableServer} = require('../lib/SableServer.js');
const {sableSync} = require('../lib/middlewares/sableSync.js');

t.test('sableSync', async (t) => {
	const server = http.createServer();
	const wsServer = http.createServer();
	const port = 12345;
	await listen(server, port);
	const sableServer = SableServer.create({
		server,
		middlewares: [
			sableSync({wss: {server: wsServer}}),
		],
	});
	const res = await waitResponse(http.get(`http://localhost:${port}/sableSync.js`));
	t.match(res.headers, {'content-type': 'application/javascript'});
	const body = await res.pipe(new Logger()).promise();
	t.ok(`${body}`.startsWith('self.wsAddress'));
	await sableServer.close();
}, {timeout: 3000});
