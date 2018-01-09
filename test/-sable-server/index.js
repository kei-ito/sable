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

		test('use pwd', () => {
			const server = new SableServer();
			const expected = [process.cwd()];
			assert.deepEqual(server.documentRoot, expected);
		});

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

		test('relative paths', () => {
			const testDirectory = path.join(directories.temp, 'documentRoot');
			const relativePath = 'relative-path-directory';
			const server = new SableServer({
				documentRoot: [testDirectory, relativePath],
			});
			const expected = [testDirectory, relativePath];
			assert.deepEqual(server.documentRoot, expected);
		});
	});

	test('wsPort', () => {
		const server = new SableServer();
		assert.equal(server.wsPort, null);
	});

	test('sendMessage', (test) => {
		test('use available connections', () => {
			assert.doesNotThrow(() => {
				new SableServer().sendMessage('message');
			});
		});
	});

	test('listen/close', (test) => {
		const server = new SableServer();
		test('listen', () => {
			return server.listen()
			.then((resolved) => {
				assert(server === resolved);
				assert(0 < server.address().port);
			});
		});
		test('close', () => {
			return server.close();
		});
	});

	test('use an avaiable port', (test) => {
		const server1 = new SableServer();
		const server2 = new SableServer();
		test('listen', () => {
			return server1.listen()
			.then((resolved) => {
				assert(server1 === resolved);
				assert(0 < server1.address().port);
				return server2.listen();
			})
			.then((resolved) => {
				assert(server2 === resolved);
				assert(server1.address().port < server2.address().port);
			});
		});
		test('close', () => {
			return Promise.all([
				server1.close(),
				server2.close(),
			]);
		});
	});

	test('no avaiable ports', (test) => {
		const server1 = new SableServer({listen: 65535});
		const server2 = new SableServer({listen: 65535});
		test('listen', () => {
			return server1.listen()
			.then((resolved) => {
				assert(server1 === resolved);
				assert(0 < server1.address().port);
				return server2.listen();
			})
			.then(() => {
				throw new Error('Resolved unexpectedly');
			})
			.catch(() => {});
		});
		test('close', () => {
			return Promise.all([
				server1.close(),
				server2.close(),
			]);
		});
	});

	test('start/close', (test) => {
		const testDirectory = path.join(directories.temp, 'start-close');
		const server = new SableServer({documentRoot: testDirectory});
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
		test('wsPort', () => {
			assert(0 < server.wsPort);
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
			test('response body', (test) => {
				test.lines(res.body, [
					'<!doctype html>',
					`<script id="sable-wsport" type="text/plain">${server.wsPort}</script>`,
					'<script src="/sable-script.js"></script>',
					'<meta charset="utf-8">',
					'<link rel="stylesheet" href="style.css">',
					'<script>const messageElement = 0</script>',
					'<h1>Title</h1>',
					'<p>paragraph</p>',
				]);
			});
		});
		test('GET /style.css', (test) => {
			let res;
			test('request', () => {
				return request(server, '/style.css')
				.then((response) => {
					res = response;
				});
			});
			test('response status/headers', (test) => {
				assert.equal(res.statusCode, 200);
				test.object(res.headers, {
					'content-type': (value) => value.startsWith('text/css'),
					'content-length': '18',
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

	test('errors from middleware', (test) => {
		test('no middlewares', () => {
			const testDirectory = path.join(directories.temp, 'error-sync');
			const server = new SableServer({
				documentRoot: testDirectory,
				middlewares: [
					() => {
						throw new Error('Expected');
					},
				],
			});
			server.middlewares.splice(0, server.middlewares.length);
			test('start', () => server.start());
			test('GET /', (test) => {
				let res;
				test('request', () => {
					return request(server, '/')
					.then((response) => {
						res = response;
					});
				});
				test('response status/headers', () => {
					assert.equal(res.statusCode, 500);
				});
			});
			test('close', () => {
				return server.close();
			});
		});
		test('sync', () => {
			const testDirectory = path.join(directories.temp, 'error-sync');
			const server = new SableServer({
				documentRoot: testDirectory,
				middlewares: [
					() => {
						throw new Error('Expected');
					},
				],
			});
			test('start', () => server.start());
			test('GET /', (test) => {
				let res;
				test('request', () => {
					return request(server, '/')
					.then((response) => {
						res = response;
					});
				});
				test('response status/headers', () => {
					assert.equal(res.statusCode, 500);
				});
				test('read response body', () => {
					return readStream(res)
					.then((buffer) => {
						res.body = buffer;
					});
				});
				test('response body', (test) => {
					test.lines(res.body, 'Error: Expected');
				});
			});
			test('close', () => {
				return server.close();
			});
		});
		test('async', () => {
			const testDirectory = path.join(directories.temp, 'error-sync');
			const server = new SableServer({
				documentRoot: testDirectory,
				middlewares: [
					() => {
						return Promise.reject(new Error('Expected'));
					},
				],
			});
			test('start', () => server.start());
			test('GET /', (test) => {
				let res;
				test('request', () => {
					return request(server, '/')
					.then((response) => {
						res = response;
					});
				});
				test('response status/headers', () => {
					assert.equal(res.statusCode, 500);
				});
				test('read response body', () => {
					return readStream(res)
					.then((buffer) => {
						res.body = buffer;
					});
				});
				test('response body', (test) => {
					test.lines(res.body, 'Error: Expected');
				});
			});
			test('close', () => {
				return server.close();
			});
		});
	});

	test('invalid wss port', (test) => {
		const testDirectory = path.join(directories.temp, 'invalid-wss-port');
		const server1 = new SableServer({
			documentRoot: testDirectory,
			ws: {port: 65535},
		});
		const server2 = new SableServer({
			documentRoot: testDirectory,
			ws: {port: 65535},
		});
		test('start', () => {
			return Promise.all([
				server1.start(),
				server2.start(),
			])
			.then(() => {
				throw new Error('Resolved unexpectedly');
			})
			.catch(() => {});
		});
		test('close', () => {
			return Promise.all([
				server1.close(),
				server2.close(),
			]);
		});
	});

	test('contentTypes', (test) => {
		const testDirectory = path.join(directories.temp, 'content-types');
		const server = new SableServer({
			documentRoot: testDirectory,
			contentType: {
				'text/plain': ['html'],
			},
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

		test('GET /index.html', (test) => {
			let res;

			test('request', () => {
				return request(server, '/index.html')
				.then((response) => {
					res = response;
				});
			});

			test('response status/headers', () => {
				assert.equal(res.statusCode, 200);
				assert.equal(res.headers['content-type'], 'text/plain');
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

}, {timeout: 10000});
