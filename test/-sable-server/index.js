const assert = require('assert');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const cp = require('@nlib/cp');
const test = require('@nlib/test');
const SableServer = require('../../src/-sable-server');
const request = require('../lib/request');
const readStream = require('../lib/read-stream');
const directories = require('../lib/directories');

test('SableServer', (test) => {

	test('constructor', () => {
		assert.doesNotThrow(() => {
			return new SableServer();
		});
	});

	test('middlewares', (test) => {

		test('is an array', () => {
			assert(Array.isArray(new SableServer().middlewares));
		});

		test('sandwich', () => {
			const middleware1 = (req, res, next) => {
				return next();
			};
			const middleware2 = (req, res, next) => {
				return next();
			};
			const expected = [
				middleware1,
				middleware2,
			];
			assert.deepEqual(new SableServer({
				middlewares: [
					middleware1,
					middleware2,
				],
			}).middlewares.slice(1, 3), expected);
		});
	});

	test('documentRoot', (test) => {

		test('convert to an array', () => {
			const testDirectory = path.join(directories.temp, 'documentRoot');
			const server = new SableServer({
				documentRoot: testDirectory,
			});
			const expected = [testDirectory];
			assert.deepEqual(server.documentRoot, expected);
		});

		test('copy an array', () => {
			const testDirectory = path.join(directories.temp, 'documentRoot');
			const server = new SableServer({
				documentRoot: [testDirectory],
			});
			const expected = [testDirectory];
			assert.deepEqual(server.documentRoot, expected);
		});

		test('convert relative paths', () => {
			const testDirectory = path.join(directories.temp, 'documentRoot');
			const relativePath = 'relative-path-directory';
			const server = new SableServer({
				documentRoot: [testDirectory, relativePath],
			});
			const expected = [testDirectory, path.join(process.cwd(), relativePath)];
			assert.deepEqual(server.documentRoot, expected);
		});
	});

	test('sendMessage', (test) => {
		test('use available connections', () => {
			assert.doesNotThrow(() => {
				new SableServer().sendMessage('message');
			});
		});
	});

	test('listen/close', () => {
		const server = new SableServer();
		return server.listen()
		.then((resolved) => {
			assert(server === resolved);
			assert(0 < server.address().port);
			return server.close();
		});
	});

	test('start/close', (test) => {
		const testDirectory = path.join(directories.temp, 'start-close');
		const server = new SableServer({
			documentRoot: testDirectory,
		});

		test('copy files', () => {
			return cp(directories.src, testDirectory);
		});

		test('start', () => {
			return server.start()
			.then((resolved) => {
				assert(server === resolved);
			});
		});

		test('check state', () => {
			assert(0 < server.address().port);
		});

		test('startWatcher returns current watcher', () => {
			return server.startWatcher()
			.then((watcher) => {
				assert.equal(watcher, server.watcher);
			});
		});

		test('startWebSocketServer returns current watcher', () => {
			return server.startWebSocketServer()
			.then((wss) => {
				assert.equal(wss, server.wss);
			});
		});

		test('GET /', (test) => {
			let res;

			test('request', () => {
				return request(server, '/')
				.then((response) => {
					res = response;
				});
			});

			test('response status/headers', () => {
				assert.equal(res.statusCode, 200);
				assert(res.headers['content-type'].startsWith('text/html'));
			});

			test('read response body', () => {
				return readStream(res)
				.then((buffer) => {
					res.body = buffer;
				});
			});

			test('response body', () => {
				const lines = res.body.toString().split(/\r\n|\r|\n/);
				[
					'<!doctype html>',
					`<script id="sable-wsport" type="text/plain">${server.wsPort}</script>`,
					'<script src="/sable-script.js"></script>',
					'<meta charset="utf-8">',
					'<link rel="stylesheet" href="style.css">',
					'<h1>Title</h1>',
					'<p>paragraph</p>',
				]
				.forEach((expected, index) => {
					const actual = lines[index];
					assert.equal(actual, expected);
				});
			});
		});

		test('GET /directory', (test) => {
			let res;

			test('request', () => {
				return request(server, '/directory')
				.then((response) => {
					res = response;
				});
			});

			test('response status/headers', () => {
				assert.equal(res.statusCode, 301);
				assert(res.headers.location.endsWith('/directory/'));
			});

		});

		test('GET /not-found', (test) => {
			let res;

			test('request', () => {
				return request(server, '/not-found')
				.then((response) => {
					res = response;
				});
			});

			test('response status/headers', () => {
				assert.equal(res.statusCode, 404);
			});

		});

		test('GET /directory/', (test) => {

			let res;

			test('request', () => {
				return request(server, '/directory/')
				.then((response) => {
					res = response;
				});
			});

			test('response status/headers', () => {
				assert.equal(res.statusCode, 200);
				assert(res.headers['content-type'].startsWith('text/html'));
			});

			test('read response body', () => {
				return readStream(res)
				.then((buffer) => {
					res.body = buffer;
				});
			});

			test('response body', () => {
				const lines = res.body.toString().split(/\r\n|\r|\n/);
				[
					'<!doctype html>',
					`<script id="sable-wsport" type="text/plain">${server.wsPort}</script>`,
					'<script src="/sable-script.js"></script>',
				]
				.forEach((expected, index) => {
					const actual = lines[index];
					assert.equal(actual, expected);
				});
				[
					'..',
					'index/',
					'sub-directory/',
					'file.txt',
					'no-extension',
				]
				.forEach((fileName) => {
					assert(lines.find((line) => {
						return line.includes(`<a href="${fileName}"`);
					}));
				});
			});

		});

		test('close', () => {
			return server.close();
		});

	});

	test('file-watcher', (test) => {

		const testDirectory = path.join(directories.temp, 'file-watcher');
		const targetFile = path.join(testDirectory, 'index.html');
		let ws;
		const server = new SableServer({
			documentRoot: testDirectory,
		});

		test('copy files', () => {
			return cp(directories.src, testDirectory);
		});

		test('start a server', () => {
			return server.start()
			.then((resolved) => {
				assert(server === resolved);
			});
		});

		test('state', () => {
			assert(0 < server.address().port);
		});

		test('start a websocket server', () => {
			return new Promise((resolve, reject) => {
				ws = new WebSocket(`ws://127.0.0.1:${server.wsPort}`, {
					headers: {'user-agent': 'sable-test'},
				})
				.once('error', reject)
				.once('open', () => {
					ws.removeAllListeners();
					resolve();
				});
			});
		});

		test('message', () => {
			return new Promise((resolve, reject) => {
				ws
				.once('error', reject)
				.once('message', resolve);
				fs.utimes(targetFile, new Date(), new Date(), (error) => {
					if (error) {
						reject(error);
					}
				});
			})
			.then((actual) => {
				const expected = `/${path.relative(testDirectory, targetFile)}`;
				assert.equal(actual, expected);
			});
		});

		test('close', () => {
			ws.close();
			return server.close();
		});

	});

});
