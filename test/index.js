const assert = require('assert');
const path = require('path');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const promisify = require('j1/promisify');
const readStream = require('j1/readStream');
const writeFile = require('j1/writeFile');
const readFile = promisify(fs.readFile, fs);
const readdir = promisify(fs.readdir, fs);

const SableServer = require('..');
const {
	OK: HTTP_OK,
	NOT_FOUND: HTTP_NOT_FOUND,
	MOVED_PERMANENTLY: HTTP_MOVED_PERMANENTLY,
	SERVER_ERROR: HTTP_SERVER_ERROR
} = require('../statusCodes');

const PORT = 4000;
const tempDir = path.join(__dirname, 'temp');

function get(server, pathname) {
	return new Promise(function (resolve, reject) {
		http.request({
			host: '127.0.0.1',
			port: server.address().port,
			path: pathname
		})
		.once('error', reject)
		.once('response', resolve)
		.end();
	});
}

describe('SableServer', function () {

	let server;
	let ws;

	before(async function () {
		await writeFile(path.join(tempDir, 'index.html'), [
			'<!doctype html>',
			'<meta charset="utf-8">',
			'<link rel="stylesheet" href="index.css">',
			'sable test',
			'<script src="index.js"></script>',
			''
		].join('\n'));
		await writeFile(path.join(tempDir, 'index.js'), 'console.log(\'sable test\');\n');
		await writeFile(path.join(tempDir, 'index.css'), 'body {color: red}\n');
	});

	afterEach(function () {
		if (server) {
			server.close();
		}
		if (ws) {
			ws.close();
		}
	});

	it('should start a server', async function () {
		server = new SableServer({port: PORT});
		await server.listen();
		const res = await get(server, '/test/temp/index.html');
		const data = await readStream(res);
		const actual = data.toString();
		const expected = await readFile(path.join(tempDir, 'index.html'), 'utf8');
		assert.equal(actual, expected);
	});

	it('should start a websocket server', async function () {
		server = new SableServer({port: PORT});
		await server.listen();
		await server.startWebSocketServer();
		ws = new WebSocket(`ws://127.0.0.1:${server.wss.options.port}`);
		await new Promise((resolve, reject) => {
			ws
			.once('error', reject)
			.once('open', resolve);
		});
	});

	it('should inject a snippet to .html files', async function () {
		server = new SableServer({port: PORT});
		await server.listen();
		await server.startWebSocketServer();
		const res = await get(server, '/test/temp/index.html');
		const data = await readStream(res);
		const actual = data.toString();
		const expected = await readFile(path.join(tempDir, 'index.html'), 'utf8');
		assert.equal(actual !== expected, true);
	});

	it('should send a message when a file is updated', async function () {
		server = new SableServer({port: PORT});
		await server.start();
		ws = new WebSocket(`ws://127.0.0.1:${server.wss.options.port}`);
		await new Promise((resolve, reject) => {
			ws
			.once('error', reject)
			.once('open', resolve);
		});
		const [message] = await Promise.all([
			new Promise((resolve) => {
				ws.once('message', resolve);
			}),
			writeFile(path.join(tempDir, 'index.js'), 'console.log(\'sable test 2\');\n')
		]);
		assert.equal(message, 'test/temp/index.js');
	});

	it('should redirect a request to a directory', async function () {
		server = new SableServer({port: PORT});
		await server.listen();
		const res = await get(server, '/test');
		assert.equal(res.statusCode, HTTP_MOVED_PERMANENTLY);
		assert.equal(res.headers.location, '/test/');
	});

	it('should respond an index page of a directory', async function () {
		server = new SableServer({port: PORT});
		await server.listen();
		const res = await get(server, '/test/');
		const data = await readStream(res);
		const files = [];
		data.toString().replace(/<tr><td><a[^>]*?href="([^>"]+)"/g, (match, file) => {
			files.push(file);
		});
		const expected = [
			'..',
			...await readdir(__dirname)
		];
		assert.deepEqual(files, expected);
	});

	it(`should respond ${HTTP_NOT_FOUND}`, async function () {
		server = new SableServer({port: PORT});
		await server.listen();
		const res = await get(server, `/${Date.now()}`);
		assert.equal(res.statusCode, HTTP_NOT_FOUND);
	});

	it('should respond "sable-" prefixed scripts', async function () {
		server = new SableServer({port: PORT});
		await server.listen();
		await server.startWebSocketServer();
		const res = await get(server, '/sable-watcher.js');
		assert.equal(res.statusCode, HTTP_OK);
	});

	it(`should respond ${HTTP_SERVER_ERROR} on no middlewares`, async function () {
		server = new SableServer({port: PORT});
		await server.listen();
		server.middlewares = [];
		const res = await get(server, `/${Date.now()}`);
		assert.equal(res.statusCode, HTTP_SERVER_ERROR);
	});

	it('should set middlewares', async function () {
		const requests = [];
		const responses = [];
		server = new SableServer({
			port: PORT,
			middlewares: [
				function (req, res, next) {
					requests.push(req.url);
					next();
				},
				function (req, res) {
					res.end(req.url);
				}
			]
		});
		await server.listen();
		responses.push((await readStream(await get(server, '/a'))).toString());
		responses.push((await readStream(await get(server, '/b'))).toString());
		responses.push((await readStream(await get(server, '/c'))).toString());
		responses.push((await readStream(await get(server, '/d'))).toString());
		const expected = ['/a', '/b', '/c', '/d'];
		assert.deepEqual(requests, expected);
		assert.deepEqual(responses, expected);
	});

});
