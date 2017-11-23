const assert = require('assert');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const test = require('@nlib/test');
const cp = require('@nlib/cp');
const SableServer = require('../..');
const request = require('../lib/request');
const readStream = require('../lib/read-stream');
const directories = require('../lib/directories');

test('SableServer', (test) => {

	test('constructor', (test) => {

		test('creates a server instance', () => {
			assert.doesNotThrow(() => {
				return new SableServer();
			});
		});

		test('throws an error if the argument is not an object', () => {
			assert.throws(() => {
				return new SableServer(0);
			});
		});

	});

	test('middlewares', (test) => {

		test('middlewares is an array', () => {
			const server = new SableServer();
			assert(Array.isArray(server.middlewares));
		});

		test('custom middlewares are wrapped', () => {
			const middleware1 = (req, res, next) => {
				return next();
			};
			const middleware2 = (req, res, next) => {
				return next();
			};
			const server = new SableServer({
				middlewares: [
					middleware1,
					middleware2,
				],
			});
			const expected = [
				middleware1,
				middleware2,
			];
			assert.deepEqual(server.middlewares.slice(1, 3), expected);
		});

	});

	test('documentRoot', (test) => {

		const testDirectory = path.join(directories.temp, 'documentRoot');

		test('receives a string', () => {
			const server = new SableServer({
				documentRoot: testDirectory,
			});
			const expected = [testDirectory];
			assert.deepEqual(server.documentRoot, expected);
		});

		test('receives an array of absolute paths', () => {
			const server = new SableServer({
				documentRoot: [testDirectory],
			});
			const expected = [testDirectory];
			assert.deepEqual(server.documentRoot, expected);
		});

		test('receives an array of mixed paths', () => {
			const relativePath = 'relative-path-directory';
			const server = new SableServer({
				documentRoot: [testDirectory, relativePath],
			});
			const expected = [testDirectory, path.join(process.cwd(), relativePath)];
			assert.deepEqual(server.documentRoot, expected);
		});

	});

	test('listen/close', (test) => {

		const server = new SableServer();

		test('returns Promise<SableServer>', () => {
			return server.listen()
			.then((resolved) => {
				assert(server === resolved);
			});
		});

		test('is listening a port', () => {
			assert(0 < server.address().port);
		});

		test('close()', () => {
			return server.close();
		});

	});

	test('start/close', (test) => {

		const testDirectory = path.join(directories.temp, 'start-close');

		const server = new SableServer({
			documentRoot: testDirectory,
		});

		test(`copy ${directories.src} to ${testDirectory}`, () => {
			return cp(directories.src, testDirectory);
		});

		test('returns Promise<SableServer>', () => {
			return server.start()
			.then((resolved) => {
				assert(server === resolved);
			});
		});

		test('has a port', () => {
			assert(0 < server.address().port);
		});

		test('GET /', (test) => {

			let res;

			test('request', () => {
				return request(server, '/')
				.then((response) => {
					res = response;
				});
			});

			test('res.statusCode', () => {
				assert.equal(res.statusCode, 200);
			});

			test('res.headers.content-type', () => {
				assert(res.headers['content-type'].startsWith('text/html'));
			});

			test('read response body', () => {
				return readStream(res)
				.then((buffer) => {
					res.body = buffer;
				});
			});

			test('check response body', (test) => {
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
					test(`line ${index + 1}: ${actual}`, () => {
						assert.equal(actual, expected);
					});
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

			test('res.statusCode', () => {
				assert.equal(res.statusCode, 301);
			});

			test('res.headers.location', () => {
				assert(res.headers.location.endsWith('/directory/'));
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

			test('res.statusCode', () => {
				assert.equal(res.statusCode, 200);
			});

			test('res.headers.content-type', () => {
				assert(res.headers['content-type'].startsWith('text/html'));
			});

			test('read response body', () => {
				return readStream(res)
				.then((buffer) => {
					res.body = buffer;
				});
			});

			test('check response body', (test) => {
				const lines = res.body.toString().split(/\r\n|\r|\n/);
				[
					'<!doctype html>',
					`<script id="sable-wsport" type="text/plain">${server.wsPort}</script>`,
					'<script src="/sable-script.js"></script>',
				]
				.forEach((expected, index) => {
					const actual = lines[index];
					test(`line ${index + 1}: ${actual}`, () => {
						assert.equal(actual, expected);
					});
				});
				[
					'..',
					'index/',
					'sub-directory/',
					'file.txt',
					'no-extension',
				]
				.forEach((fileName) => {
					test(`has a link to ${fileName}`, () => {
						assert(lines.find((line) => {
							return line.includes(`<a href="${fileName}"`);
						}));
					});
				});
			});

		});

		test('close()', () => {
			return server.close();
		});

	});

	test('file watcher', (test) => {

		const testDirectory = path.join(directories.temp, 'file-watcher');
		let ws;

		const server = new SableServer({
			documentRoot: testDirectory,
		});

		test(`copy ${directories.src} to ${testDirectory}`, () => {
			return cp(directories.src, testDirectory);
		});

		test('returns Promise<SableServer>', () => {
			return server.start()
			.then((resolved) => {
				assert(server === resolved);
			});
		});

		test('has a port', () => {
			assert(0 < server.address().port);
		});

		test('has a websocket server', () => {
			return new Promise((resolve, reject) => {
				ws = new WebSocket(`ws://127.0.0.1:${server.wsPort}`, {
					headers: {'user-agent': 'sable-test'},
				})
				.once('error', reject)
				.once('open', resolve);
			});
		});

		test('has a file watcher', () => {
			const targetFile = path.join(testDirectory, 'index.html');
			ws.removeAllListeners();
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

		test('close ws', () => {
			ws.close();
		});

		test('close()', () => {
			return server.close();
		});

	});

});
