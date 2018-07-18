const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const cp = require('@nlib/cp');
const t = require('tap');
const {lineSplitter} = require('@nlib/util');
const {SableServer, listen, close} = require('../..');
const request = require('../lib/request');
const readStream = require('../lib/read-stream');
const directories = require('../lib/directories');

t.test('SableServer', (t) => {

	t.test('constructor', (t) => {
		t.doesNotThrow(() => new SableServer());
		t.end();
	});

	t.test('middlewares', (t) => {
		t.ok(Array.isArray(new SableServer().middlewares));
		t.test('sandwich', (t) => {
			const middleware1 = (req, res, next) => next();
			const middleware2 = (req, res, next) => next();
			const expected = [middleware1, middleware2];
			t.match(
				new SableServer({middlewares: expected.slice()}).middlewares.slice(1, 3),
				expected
			);
			t.end();
		});
		t.end();
	});

	t.test('documentRoot', (t) => {
		t.test('use pwd', (t) => {
			const server = new SableServer();
			const expected = [process.cwd()];
			t.match(server.documentRoot, expected);
			t.end();
		});
		t.test('convert to an array', (t) => {
			const testDirectory = path.join(directories.temp, 'documentRoot');
			const server = new SableServer({documentRoot: testDirectory});
			const expected = [testDirectory];
			t.match(server.documentRoot, expected);
			t.end();
		});
		t.test('copy an array', (t) => {
			const testDirectory = path.join(directories.temp, 'documentRoot');
			const server = new SableServer({documentRoot: [testDirectory]});
			const expected = [testDirectory];
			t.match(server.documentRoot, expected);
			t.end();
		});
		t.test('relative paths', (t) => {
			const testDirectory = path.join(directories.temp, 'documentRoot');
			const relativePath = 'relative-path-directory';
			const server = new SableServer({documentRoot: [testDirectory, relativePath]});
			const expected = [testDirectory, path.join(process.cwd(), relativePath)];
			t.match(server.documentRoot, expected);
			t.end();
		});
		t.end();
	});

	t.test('wsPort', (t) => {
		const server = new SableServer();
		t.equal(server.wsPort, null);
		t.end();
	});

	t.test('sendMessage', (t) => {
		t.test('use available connections', (t) => {
			t.doesNotThrow(() => {
				new SableServer().sendMessage('message');
			});
			t.end();
		});
		t.end();
	});

	t.test('listen/close', (t) => {
		const server = new SableServer();
		t.test('listen', (t) => {
			return listen(server)
			.then((resolved) => {
				t.ok(server === resolved);
				t.ok(0 < server.server.address().port);
			});
		});
		t.test('close', () => close(server));
		t.end();
	});

	t.test('use an avaiable port', (t) => {
		const server1 = new SableServer();
		const server2 = new SableServer();
		t.test('listen', (t) => {
			return listen(server1)
			.then((resolved) => {
				t.ok(server1 === resolved);
				t.ok(0 < server1.address().port);
				return listen(server2);
			})
			.then((resolved) => {
				t.ok(server2 === resolved);
				t.test(`server1.port: ${server1.address().port}`, (t) => {
					t.ok(0 < server1.address().port);
					t.end();
				});
				t.test(`server2.port: ${server2.address().port}`, (t) => {
					t.ok(0 < server2.address().port);
					t.end();
				});
				t.ok(server1.address().port < server2.address().port);
			});
		});
		t.test('close 1', () => close(server1));
		t.test('close 2', () => close(server2));
		t.end();
	});

	t.test('no avaiable ports', (t) => {
		const server1 = new SableServer({listen: 65535});
		const server2 = new SableServer({listen: 65535});
		t.test('listen', (t) => {
			return listen(server1)
			.then((resolved) => {
				t.ok(server1 === resolved);
				t.ok(0 < server1.address().port);
				return listen(server2);
			})
			.then(() => {
				throw new Error('Resolved unexpectedly');
			})
			.catch(() => {});
		});
		t.test('close 1', () => close(server1));
		t.test('close 2', () => close(server2));
		t.end();
	});

	t.test('start/close', (t) => {
		const testDirectory = path.join(directories.temp, 'start-close');
		const server = new SableServer({documentRoot: testDirectory});
		t.test('copy files', () => cp(directories.src, testDirectory));
		t.test('start', (t) => {
			return server.start()
			.then((resolved) => {
				t.ok(server === resolved);
			});
		});
		t.test('check state', (t) => {
			t.ok(0 < server.address().port);
			t.end();
		});
		t.test('startWatcher returns current watcher', (t) => {
			return server.startWatcher()
			.then((watcher) => {
				t.equal(watcher, server.watcher);
			});
		});
		t.test('startWebSocketServer returns current watcher', (t) => {
			return server.startWebSocketServer()
			.then((wss) => {
				t.equal(wss, server.wss);
			});
		});
		t.test('wsPort', (t) => {
			t.ok(0 < server.wsPort);
			t.end();
		});
		t.test('GET /', (t) => {
			let res;
			t.test('request', () => {
				return request(server, '/')
				.then((response) => {
					res = response;
				});
			});
			t.test('response status/headers', (t) => {
				t.equal(res.statusCode, 200);
				t.ok(res.headers['content-type'].startsWith('text/html'));
				t.end();
			});
			t.test('read response body', () => {
				return readStream(res)
				.then((buffer) => {
					res.body = buffer;
				});
			});
			t.test('response body', (t) => {
				t.match(
					[...lineSplitter(`${res.body}`)],
					[
						'<!doctype html>',
						`<script id="sable-wsport" type="text/plain">${server.wsPort}</script>`,
						'<script src="/sable-script.js"></script>',
						'<meta charset="utf-8">',
						'<link rel="stylesheet" href="style.css">',
						'<script>const messageElement = 0</script>',
						'<h1>Title</h1>',
						'<p>paragraph</p>',
					]
				);
				t.end();
			});
			t.end();
		});
		t.test('GET /style.css', (t) => {
			let res;
			t.test('request', () => {
				return request(server, '/style.css')
				.then((response) => {
					res = response;
				});
			});
			t.test('response status/headers', (t) => {
				t.equal(res.statusCode, 200);
				t.ok(res.headers['content-type'].startsWith('text/css'));
				t.equal(res.headers['content-length'], '18');
				t.end();
			});
			t.end();
		});
		t.test('GET /directory', (t) => {
			let res;
			t.test('request', () => {
				return request(server, '/directory')
				.then((response) => {
					res = response;
				});
			});
			t.test('response status/headers', (t) => {
				t.equal(res.statusCode, 301);
				t.ok(res.headers.location.endsWith('/directory/'));
				t.end();
			});
			t.end();
		});
		t.test('GET /not-found', (t) => {
			let res;
			t.test('request', () => {
				return request(server, '/not-found')
				.then((response) => {
					res = response;
				});
			});
			t.test('response status/headers', (t) => {
				t.equal(res.statusCode, 404);
				t.end();
			});
			t.end();
		});
		t.test('GET /directory/', (t) => {
			let res;
			t.test('request', () => {
				return request(server, '/directory/')
				.then((response) => {
					res = response;
				});
			});
			t.test('response status/headers', (t) => {
				t.equal(res.statusCode, 200);
				t.ok(res.headers['content-type'].startsWith('text/html'));
				t.end();
			});
			t.test('read response body', () => {
				return readStream(res)
				.then((buffer) => {
					res.body = buffer;
				});
			});
			t.test('response body', (t) => {
				const lines = res.body.toString().split(/\r\n|\r|\n/);
				[
					'<!doctype html>',
					`<script id="sable-wsport" type="text/plain">${server.wsPort}</script>`,
					'<script src="/sable-script.js"></script>',
				]
				.forEach((expected, index) => {
					const actual = lines[index];
					t.equal(actual, expected);
				});
				[
					'..',
					'index/',
					'sub-directory/',
					'file.txt',
					'no-extension',
				]
				.forEach((fileName) => {
					t.ok(lines.find((line) => line.includes(`<a href="${fileName}"`)));
				});
				t.end();
			});
			t.end();
		});
		t.test('close', () => close(server));
		t.end();
	});

	t.test('errors from middleware', (t) => {
		t.test('no middlewares', (t) => {
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
			t.test('start', () => server.start());
			t.test('GET /', (t) => {
				let res;
				t.test('request', () => {
					return request(server, '/')
					.then((response) => {
						res = response;
					});
				});
				t.test('response status/headers', (t) => {
					t.equal(res.statusCode, 500);
					t.end();
				});
				t.end();
			});
			t.test('close', () => close(server));
			t.end();
		});
		t.test('sync', (t) => {
			const testDirectory = path.join(directories.temp, 'error-sync');
			const server = new SableServer({
				documentRoot: testDirectory,
				middlewares: [
					() => {
						throw new Error('Expected');
					},
				],
			});
			t.test('start', () => server.start());
			t.test('GET /', (t) => {
				let res;
				t.test('request', () => {
					return request(server, '/')
					.then((response) => {
						res = response;
					});
				});
				t.test('response status/headers', (t) => {
					t.equal(res.statusCode, 500);
					t.end();
				});
				t.test('read response body', () => {
					return readStream(res)
					.then((buffer) => {
						res.body = buffer;
					});
				});
				t.test('response body', (t) => {
					t.equal(`${res.body}`, 'Error: Expected');
					t.end();
				});
				t.end();
			});
			t.test('close', () => close(server));
			t.end();
		});

		t.test('async', (t) => {
			const testDirectory = path.join(directories.temp, 'error-sync');
			const server = new SableServer({
				documentRoot: testDirectory,
				middlewares: [
					() => Promise.reject(new Error('Expected')),
				],
			});
			t.test('start', () => server.start());
			t.test('GET /', (t) => {
				let res;
				t.test('request', () => {
					return request(server, '/')
					.then((response) => {
						res = response;
					});
				});
				t.test('response status/headers', (t) => {
					t.equal(res.statusCode, 500);
					t.end();
				});
				t.test('read response body', () => {
					return readStream(res)
					.then((buffer) => {
						res.body = buffer;
					});
				});
				t.test('response body', (t) => {
					t.equal(`${res.body}`, 'Error: Expected');
					t.end();
				});
				t.end();
			});
			t.test('close', () => close(server));
			t.end();
		});
		t.end();
	});

	// t.test('invalid wss port', (t) => {
	// 	const testDirectory = path.join(directories.temp, 'invalid-wss-port');
	// 	const server1 = new SableServer({
	// 		documentRoot: testDirectory,
	// 		ws: {port: 65535},
	// 	});
	// 	const server2 = new SableServer({
	// 		documentRoot: testDirectory,
	// 		ws: {port: 65535},
	// 	});
	// 	t.test('start 1', () => server1.start());
	// 	t.test('start 2', () => {
	// 		return server2.start()
	// 		.then(
	// 			() => {
	// 				throw new Error('Resolved unexpectedly');
	// 			},
	// 			() => {}
	// 		);
	// 	});
	// 	t.test('close 1', () => close(server1));
	// 	t.test('close 2', () => close(server2));
	// 	t.end();
	// });

	t.test('contentTypes', (t) => {
		const testDirectory = path.join(directories.temp, 'content-types');
		const server = new SableServer({
			documentRoot: testDirectory,
			contentType: {'text/plain': ['html']},
		});
		t.test('copy files', () => cp(directories.src, testDirectory));
		t.test('start', (t) => {
			return server.start()
			.then((resolved) => {
				t.ok(server === resolved);
			});
		});
		t.test('check state', (t) => {
			t.ok(0 < server.address().port);
			t.end();
		});
		t.test('GET /index.html', (t) => {
			let res;
			t.test('request', () => {
				return request(server, '/index.html')
				.then((response) => {
					res = response;
				});
			});
			t.test('response status/headers', (t) => {
				t.equal(res.statusCode, 200);
				t.equal(res.headers['content-type'], 'text/plain');
				t.end();
			});
			t.end();
		});
		t.test('close', () => close(server));
		t.end();
	});

	t.test('file-watcher', (t) => {
		const testDirectory = path.join(directories.temp, 'file-watcher');
		const targetFile = path.join(testDirectory, 'index.html');
		let ws;
		const server = new SableServer({
			documentRoot: testDirectory,
		});
		t.test('copy files', () => {
			return cp(directories.src, testDirectory);
		});
		t.test('start a server', (t) => {
			return server.start()
			.then((resolved) => {
				t.ok(server === resolved);
			});
		});
		t.test('state', (t) => {
			t.ok(0 < server.address().port);
			t.end();
		});
		t.test('start a websocket server', () => {
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
		t.test('message', (t) => {
			return new Promise((resolve, reject) => {
				ws
				.once('error', reject)
				.once('message', resolve);
				fs.utimes(targetFile, new Date(), new Date(), (error) => error && reject(error));
			})
			.then((actual) => {
				t.equal(actual, `/${path.relative(testDirectory, targetFile)}`);
			});
		});
		t.test('close ws', (t) => {
			ws.close();
			t.end();
		});
		t.test('close', () => close(server));
		t.end();
	});
	t.end();
});
