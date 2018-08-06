const http = require('http');
const t = require('tap');
const {Logger} = require('../lib/util.js');
const {SableServer} = require('../lib/SableServer.js');

t.test('constructor', (t) => {
	t.throws(() => SableServer.create());
	t.throws(() => SableServer.create({}), {code: 'ENOSERVER'});
	t.doesNotThrow(() => {
		const server = http.createServer();
		return SableServer.create({server});
	});
	t.end();
});

t.test('log', (t) => {
	const server = http.createServer();
	const sableServer = SableServer.create({
		server,
		stdout: new Logger(),
		stderr: new Logger(),
	});
	sableServer.log('foo');
	sableServer.log(new Error('bar'));
	t.equal(`${sableServer.stdout.concat()}`, 'foo\n');
	t.ok(`${sableServer.stderr.concat()}`.startsWith('Error: bar'));
	t.end();
});

t.test('middlewares', (t) => {

	t.test('ENOMIDDLEWARE (1 middlewares)', (t) => {
		const server = http.createServer();
		const sableServer = SableServer.create({
			server,
			stdout: new Logger(),
			stderr: new Logger(),
			middlewares: [],
		});
		server.emit('request');
		setImmediate(() => {
			t.ok(`${sableServer.stderr.concat()}`.startsWith('Error: No middleware'));
			t.end();
		});
	});

	t.test('Chaining', (t) => {
		const server = http.createServer();
		const called1 = [];
		const called2 = [];
		const called3 = [];
		const sableServer = SableServer.create({
			server,
			stdout: new Logger(),
			stderr: new Logger(),
			middlewares: [
				(req, res, next, server) => {
					called1.push({req, res, server});
					next();
				},
				(req, res, next, server) => {
					called2.push({req, res, server});
				},
				(req, res, next, server) => {
					called3.push({req, res, server});
				},
			],
		});
		server.emit('request', {type: 'req'}, {type: 'res'}, {type: 'foo'});
		setImmediate(() => {
			t.match(called1, called2);
			const [{req, res, server}] = called1;
			t.equal(req.type, 'req');
			t.equal(res.type, 'res');
			t.equal(server, sableServer);
			t.equal(called3.length, 0);
			t.end();
		});
	});

	t.end();

});

t.test('close', async () => {
	const server = http.createServer();
	const sableServer = SableServer.create({server});
	await sableServer.close();
});
