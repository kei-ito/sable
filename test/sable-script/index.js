const path = require('path');
const fs = require('fs');
const cp = require('@nlib/cp');
const {Builder, By} = require('selenium-webdriver');
const {Local} = require('browserstack-local');
const packageJSON = require('../../package.json');
const {SableServer, close} = require('../..');
const env = require('../lib/env');
const dateString = require('../lib/date-string');
const directories = require('../lib/directories');
const capabilities = require('../lib/capabilities');
const markResult = require('../lib/mark-result');
const t = require('tap');

t.test('sable-script', (t) => {

	capabilities
	.forEach((capability) => {
		t.test(JSON.stringify(capability), (t) => {
			const index = capabilities.indexOf(capability);
			const testDirectory = path.join(directories.temp, `sable-script-${index}`);
			const params = {
				key: `_${Date.now()}`,
			};
			let builder;
			let driver;
			let bsLocal;

			const server = new SableServer({
				documentRoot: testDirectory,
			});

			const tests = [];
			t.afterEach((done) => {
				tests.push(...t.subtests);
				done();
			});

			t.test(`copy ${directories.src} to ${testDirectory}`, () => cp(directories.src, testDirectory));
			t.test('start a server', () => server.start());

			if (env.BROWSERSTACK) {
				t.test('setup BrowserStack', (t) => {
					const project = packageJSON.name;
					const build = `${project}#${env.TRAVIS_BUILD_NUMBER || dateString()}`;
					const localIdentifier = (`${build}${dateString}`).replace(/[^\w-]/g, '');

					t.test('setup bsLocal', () => {
						// https://github.com/browserstack/browserstack-local-nodejs/blob/master/lib/Local.js
						return new Promise((resolve, reject) => {
							bsLocal = new Local();
							bsLocal.start(
								{
									key: env.BROWSERSTACK_ACCESS_KEY,
									verbose: true,
									forceLocal: true,
									onlyAutomate: true,
									only: `localhost,${server.address().port},0`,
									localIdentifier,
								},
								(error) => {
									if (error) {
										reject(error);
									} else {
										resolve();
									}
								}
							);
						});
					});

					t.test('wait for bsLocal.isRunning()', () => {
						return new Promise((resolve, reject) => {
							let count = 0;
							const check = function () {
								if (bsLocal.isRunning()) {
									resolve();
								} else if (count++ < 30) {
									setTimeout(check, 1000);
								} else {
									reject(new Error('Failed to start browserstack-local'));
								}
							};
							check();
						});
					});

					t.test('add some properties', (t) => {
						Object.assign(
							capability,
							{
								project,
								build,
								'browserstack.local': true,
								'browserstack.localIdentifier': localIdentifier,
								'browserstack.user': env.BROWSERSTACK_USERNAME,
								'browserstack.key': env.BROWSERSTACK_ACCESS_KEY,
							}
						);
						t.end();
					});

					t.end();
				});
			}

			t.test('create a builder', (t) => {
				builder = new Builder().withCapabilities(capability);
				if (env.BROWSERSTACK) {
					builder.usingServer('http://hub-cloud.browserstack.com/wd/hub');
				}
				driver = builder.build();
				t.end();
			});

			t.test('get session', () => {
				return driver.getSession()
				.then((session) => {
					params.session = session;
				});
			});

			t.test('GET /', () => {
				return Promise.all([
					new Promise((resolve) => {
						server.wss.once('connection', (client, req) => {
							params.ua0 = req.headers['user-agent'];
							resolve();
						});
					}),
					driver.get(`http://127.0.0.1:${server.address().port}/`),
				]);
			});

			t.test('change index.html', () => {
				const targetFile = path.join(server.documentRoot[0], 'index.html');
				return Promise.all([
					new Promise((resolve) => {
						server.wss.once('connection', (client, req) => {
							params.ua1 = req.headers['user-agent'];
							resolve();
						});
					}),
					new Promise((resolve, reject) => {
						fs.utimes(targetFile, new Date(), new Date(), (error) => {
							if (error) {
								reject(error);
							} else {
								resolve();
							}
						});
					}),
				]);
			});

			t.test('compare requesters', (t) => {
				t.equal(params.ua0, params.ua1);
				t.end();
			});

			t.test('put a value', () => {
				return driver.executeScript(`return window.${params.key} = '${params.key}';`);
			});

			t.test('get a value', (t) => {
				return driver.executeScript(`return window.${params.key};`)
				.then((returned) => {
					t.equal(returned, params.key);
				});
			});

			t.test('get the first h1', () => {
				return driver.findElement(By.tagName('h1'))
				.then((webElement) => {
					params.beforeh1 = webElement;
				});
			});

			t.test('get the size of the first h1', () => {
				return params.beforeh1.getRect()
				.then((size) => {
					params.beforeSize = size;
				});
			});

			t.test('change style.css', () => {
				const targetFile = path.join(server.documentRoot[0], 'style.css');
				return Promise.all([
					server.nextResponse(({req}) => {
						return req.parsedURL.pathname.endsWith('style.css');
					}),
					new Promise((resolve, reject) => {
						fs.writeFile(targetFile, 'h1 {height: 100px}', (error) => {
							if (error) {
								reject(error);
							} else {
								resolve();
							}
						});
					}),
				]);
			});

			t.test('confirm no reload was occurred', (t) => {
				return driver.executeScript(`return window.${params.key};`)
				.then((returned) => {
					t.equal(returned, params.key);
				});
			});

			t.test('wait a while', () => {
				return driver.sleep(500);
			});

			t.test('get the first h1 again', () => {
				return driver.findElement(By.tagName('h1'))
				.then((webElement) => {
					params.afterh1 = webElement;
				});
			});

			t.test('get the size of the first h1 again', () => {
				return params.afterh1.getRect()
				.then((size) => {
					params.afterSize = size;
				});
			});

			t.test('compare sizes', (t) => {
				t.test(`beforeSize: ${params.beforeSize.height}`, (t) => {
					t.ok(0 < params.beforeSize.height);
					t.end();
				});
				t.test(`afterSize: ${params.afterSize.height}`, (t) => {
					t.ok(0 < params.afterSize.height);
					t.end();
				});
				t.test('compare', (t) => {
					t.ok(params.beforeSize.height < params.afterSize.height);
					t.end();
				});
				t.end();
			});

			if (env.BROWSERSTACK) {
				t.test('mark the result', (t) => {
					const failures = new Set();
					for (const {results} of tests) {
						if (results && results.failures) {
							for (const failure of results.failures) {
								failures.add(failure);
							}
						}
					}
					const status = failures.size === 0 ? 'passed' : 'failed';
					t.test(`mark "${status}"`, () => {
						return markResult({
							session: params.session,
							driver,
							status,
						});
					});
					t.end();
				});
			}

			t.test('quit driver', () => {
				return driver.quit();
			});

			t.test('stop bsLocal', () => {
				if (bsLocal) {
					return new Promise((resolve) => {
						bsLocal.stop(resolve);
					});
				} else {
					return Promise.resolve();
				}
			});

			t.test('close', () => close(server));

			t.test('wait a while', () => {
				return driver.sleep(1000);
			});

			t.end();

		});
	});

	t.end();

});
