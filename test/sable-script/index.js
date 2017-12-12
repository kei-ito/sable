const assert = require('assert');
const path = require('path');
const fs = require('fs');
const cp = require('@nlib/cp');
const test = require('@nlib/test');
const {Builder, By} = require('selenium-webdriver');
const {Local} = require('browserstack-local');
const packageJSON = require('../../package.json');
const SableServer = require('../../src/-sable-server');
const env = require('../lib/env');
const dateString = require('../lib/date-string');
const directories = require('../lib/directories');
const capabilities = require('../lib/capabilities');
const markResult = require('../lib/mark-result');

test('sable-script', (test) => {

	capabilities
	.forEach((capability) => {
		test(JSON.stringify(capability), (test) => {
			const index = capabilities.indexOf(capability);
			const testDirectory = path.join(directories.temp, `sable-script-${index}`);
			const params = {
				key: `_${Date.now()}`,
			};
			let bsLocal;
			let builder;
			let driver;

			const server = new SableServer({
				documentRoot: testDirectory,
			});

			test(`copy ${directories.src} to ${testDirectory}`, () => {
				return cp(directories.src, testDirectory);
			});

			test('start a server', () => {
				return server.start();
			});

			if (env.BROWSERSTACK) {
				test('setup BrowserStack', (test) => {
					const project = packageJSON.name;
					const build = `${project}#${env.TRAVIS_BUILD_NUMBER || dateString()}`;
					const localIdentifier = (`${build}${dateString}`).replace(/[^\w-]/g, '');

					test('setup bsLocal', () => {
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

					test('wait for bsLocal.isRunning()', () => {
						return new Promise((resolve, reject) => {
							let count = 0;
							function check() {
								if (bsLocal.isRunning()) {
									resolve();
								} else if (count++ < 30) {
									setTimeout(check, 1000);
								} else {
									reject(new Error('Failed to start browserstack-local'));
								}
							}
							check();
						});
					});

					test('add some properties', () => {
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
					});

				});
			}

			test('create a builder', () => {
				builder = new Builder().withCapabilities(capability);
				if (env.BROWSERSTACK) {
					builder.usingServer('http://hub-cloud.browserstack.com/wd/hub');
				}
				driver = builder.build();
			});

			test('get session', () => {
				return driver.getSession()
				.then((session) => {
					params.session = session;
				});
			});

			test('GET /', () => {
				return Promise.all([
					server.nextWebSocketConnection(({req}) => {
						params.ua0 = req.headers['user-agent'];
						return true;
					}),
					driver.get(`http://127.0.0.1:${server.address().port}/`),
				]);
			});

			test('change index.html', () => {
				const targetFile = path.join(server.documentRoot[0], 'index.html');
				return Promise.all([
					server.nextWebSocketConnection(({req}) => {
						params.ua1 = req.headers['user-agent'];
						return true;
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

			test('compare requesters', () => {
				assert.equal(params.ua0, params.ua1);
			});

			test('put a value', () => {
				return driver.executeScript(`window.${params.key} = '${params.key}';`);
			});

			test('get a value', () => {
				return driver.executeScript(`return window.${params.key};`)
				.then((returned) => {
					assert.equal(returned, params.key);
				});
			});

			test('get the first h1', () => {
				return driver.findElement(By.tagName('h1'))
				.then((webElement) => {
					params.beforeh1 = webElement;
				});
			});

			test('get the size of the first h1', () => {
				return params.beforeh1.getSize()
				.then((size) => {
					params.beforeSize = size;
				});
			});

			test('change style.css', () => {
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

			test('confirm no reload was occurred', () => {
				return driver.executeScript(`return window.${params.key};`)
				.then((returned) => {
					assert.equal(returned, params.key);
				});
			});

			test('wait a while', () => {
				return driver.sleep(500);
			});

			test('get the first h1 again', () => {
				return driver.findElement(By.tagName('h1'))
				.then((webElement) => {
					params.afterh1 = webElement;
				});
			});

			test('get the size of the first h1 again', () => {
				return params.afterh1.getSize()
				.then((size) => {
					params.afterSize = size;
				});
			});

			test('compare sizes', (test) => {
				test(`beforeSize: ${params.beforeSize.height}`, () => {
					assert(0 < params.beforeSize.height);
				});
				test(`afterSize: ${params.afterSize.height}`, () => {
					assert(0 < params.afterSize.height);
				});
				test('compare', () => {
					assert(params.beforeSize.height < params.afterSize.height);
				});
			});

			if (env.BROWSERSTACK) {
				test('mark the result', (test) => {
					const errors = test.children.filter(({failed}) => {
						return failed;
					});
					const status = errors.length === 0 ? 'passed' : 'failed';
					test(`mark "${status}"`, () => {
						return markResult({
							session: params.session,
							driver,
							status,
						});
					});
				});
			}

			test('quit driver', () => {
				return driver.quit();
			});

			test('close', () => {
				return server.close();
			});

			test('wait a while', () => {
				return driver.sleep(1000);
			});

		}, {timeout: 60000});
	});
});
