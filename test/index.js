const assert = require('assert');
const path = require('path');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const promisify = require('j1/promisify');
const readStream = require('j1/readStream');
const writeFile = require('j1/writeFile');
const readFile = promisify(fs.readFile, fs);

const SableServer = require('..');

const PORT = 4000;
const tempDir = path.join(__dirname, 'temp');

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
		const res = await new Promise(function (resolve, reject) {
			http.request({
				host: '127.0.0.1',
				port: server.address().port,
				path: '/test/temp/index.html'
			})
			.once('error', reject)
			.once('response', resolve)
			.end();
		});
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
		const res = await new Promise(function (resolve, reject) {
			http.request({
				host: '127.0.0.1',
				port: server.address().port,
				path: '/test/temp/index.html'
			})
			.once('error', reject)
			.once('response', resolve)
			.end();
		});
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

});
