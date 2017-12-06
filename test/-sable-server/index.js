const assert = require('assert');
const console = require('console');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const cp = require('@nlib/cp');
const SableServer = require('../../src/-sable-server');
const request = require('../lib/request');
const readStream = require('../lib/read-stream');
const directories = require('../lib/directories');

Promise.resolve()
.then(() => {
	assert.doesNotThrow(() => {
		return new SableServer();
	});
})
.then(() => {
	assert(Array.isArray(new SableServer().middlewares));
})
.then(() => {
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
})
.then(() => {
	const testDirectory = path.join(directories.temp, 'documentRoot');
	const server = new SableServer({
		documentRoot: testDirectory,
	});
	const expected = [testDirectory];
	assert.deepEqual(server.documentRoot, expected);
})
.then(() => {
	const testDirectory = path.join(directories.temp, 'documentRoot');
	const server = new SableServer({
		documentRoot: [testDirectory],
	});
	const expected = [testDirectory];
	assert.deepEqual(server.documentRoot, expected);
})
.then(() => {
	const testDirectory = path.join(directories.temp, 'documentRoot');
	const relativePath = 'relative-path-directory';
	const server = new SableServer({
		documentRoot: [testDirectory, relativePath],
	});
	const expected = [testDirectory, path.join(process.cwd(), relativePath)];
	assert.deepEqual(server.documentRoot, expected);
})
.then(() => {
	const server = new SableServer();
	return server.listen()
	.then((resolved) => {
		assert(server === resolved);
		assert(0 < server.address().port);
		return server.close();
	});
})
.then(() => {
	const testDirectory = path.join(directories.temp, 'start-close');
	const server = new SableServer({
		documentRoot: testDirectory,
	});
	return cp(directories.src, testDirectory)
	.then(() => {
		return server.start();
	})
	.then((resolved) => {
		assert(server === resolved);
		assert(0 < server.address().port);
	})
	.then(() => {
		let res;
		return request(server, '/')
		.then((response) => {
			res = response;
			assert.equal(res.statusCode, 200);
			assert(res.headers['content-type'].startsWith('text/html'));
			return readStream(res);
		})
		.then((buffer) => {
			res.body = buffer;
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
	})
	.then(() => {
		let res;
		return request(server, '/directory')
		.then((response) => {
			res = response;
			assert.equal(res.statusCode, 301);
			assert(res.headers.location.endsWith('/directory/'));
		});
	})
	.then(() => {
		let res;
		return request(server, '/directory/')
		.then((response) => {
			res = response;
			assert.equal(res.statusCode, 200);
			assert(res.headers['content-type'].startsWith('text/html'));
			return readStream(res);
		})
		.then((buffer) => {
			res.body = buffer;
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
	})
	.then(() => {
		return server.close();
	});
})
.then(() => {
	const testDirectory = path.join(directories.temp, 'file-watcher');
	const targetFile = path.join(testDirectory, 'index.html');
	let ws;
	const server = new SableServer({
		documentRoot: testDirectory,
	});
	return cp(directories.src, testDirectory)
	.then(() => {
		return server.start();
	})
	.then((resolved) => {
		assert(server === resolved);
		assert(0 < server.address().port);
		return new Promise((resolve, reject) => {
			ws = new WebSocket(`ws://127.0.0.1:${server.wsPort}`, {
				headers: {'user-agent': 'sable-test'},
			})
			.once('error', reject)
			.once('open', resolve);
		});
	})
	.then(() => {
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
		});
	})
	.then((actual) => {
		const expected = `/${path.relative(testDirectory, targetFile)}`;
		assert.equal(actual, expected);
		ws.close();
		return server.close();
	});
})
.then(() => {
	console.log('passed: SableServer');
})
.catch((error) => {
	console.error(error);
	process.exit(1);
});
