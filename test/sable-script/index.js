const assert = require('assert');
const path = require('path');
const fs = require('fs');
const test = require('@nlib/test');
const cp = require('@nlib/cp');
const {Builder, By} = require('selenium-webdriver');
const {Local} = require('browserstack-local');
const packageJSON = require('../../package.json');
const SableServer = require('../..');
const env = require('../lib/env');
const dateString = require('../lib/date-string');
const directories = require('../lib/directories');
const capabilities = require('../lib/capabilities');
const capabilityTitle = require('../lib/capability-title');
const markResult = require('../lib/mark-result');

if (0 < capabilities.length) {
	test('sable script', (test) => {

		const testDirectory = path.join(directories.temp, 'sable-script');
		const server = new SableServer({
			documentRoot: testDirectory,
		});

		test(`copy ${directories.src} to ${testDirectory}`, () => {
			return cp(directories.src, testDirectory);
		});

		test('start a server', () => {
			return server.start();
		});

		test('run tests', (test) => {
			const queue = capabilities.slice();
			const errors = [];
			function run() {
				const capability = queue.shift();
				if (!capability) {
					return Promise.resolve();
				}
				return testCapability({
					test,
					server,
					prefix: `[${capabilities.length - queue.length}/${capabilities.length}]`,
					capability,
				})
				.catch((error) => {
					capability.error = error;
					errors.push(capability);
				})
				.then(run);
			}
			return run()
			.then(() => {
				if (0 < errors.length) {
					throw new Error(`${errors.length} capabilities failed`);
				}
			});
		});

		test('close()', () => {
			return server.close();
		});

	});
}

function testCapability({test, server, capability, prefix}) {

	function localURL(pathname) {
		return `http://127.0.0.1:${server.address().port}${pathname}`;
	}

	return test(`${prefix} ${capabilityTitle(capability)}`, function (test) {

		this.timeout = 20000;
		const params = {
			key: `_${Date.now()}`,
		};
		let bsLocal;
		let builder;
		let driver;

		if (env.BROWSERSTACK) {

			const project = packageJSON.name;
			const build = `${project}#${env.TRAVIS_BUILD_NUMBER || dateString()}`;
			const localIdentifier = (`${prefix}${build}${dateString}`).replace(/[^\w-]/g, '');

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

			test(`${prefix} add some properties`, () => {
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
		}

		test(`${prefix} create a builder`, () => {
			builder = new Builder().withCapabilities(capability);
		});

		if (env.BROWSERSTACK) {
			test(`${prefix} set an endpoint`, () => {
				builder.usingServer('http://hub-cloud.browserstack.com/wd/hub');
			});
		}

		test(`${prefix} build a driver`, () => {
			driver = builder.build();
		});

		test(`${prefix} GET ${localURL('/')}`, function () {
			this.timeout = 120000;
			return Promise.all([
				server.nextWebSocketConnection(({req}) => {
					params.ua0 = req.headers['user-agent'];
					return true;
				}),
				driver.get(localURL('/')),
			]);
		});

		test(`${prefix} change index.html`, () => {
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

		test(`${prefix} compare requesters`, () => {
			assert.equal(params.ua0, params.ua1);
		});

		test(`${prefix} put a value`, () => {
			return driver.executeScript(`window.${params.key} = '${params.key}';`);
		});

		test(`${prefix} get a value`, () => {
			return driver.executeScript(`return window.${params.key};`)
			.then((returned) => {
				assert.equal(returned, params.key);
			});
		});

		test(`${prefix} get h1`, () => {
			return driver.findElement(By.tagName('h1'))
			.then((webElement) => {
				return webElement.getSize();
			})
			.then((size) => {
				params.beforeSize = size;
			});
		});

		test(`${prefix} change style.css`, () => {
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

		test(`${prefix} confirm no reload was occurred`, () => {
			return driver.executeScript(`return window.${params.key};`)
			.then((returned) => {
				assert.equal(returned, params.key);
			});
		});

		test(`${prefix} get h1 again`, () => {
			return driver.findElement(By.tagName('h1'))
			.then((webElement) => {
				return webElement.getSize();
			})
			.then((size) => {
				params.afterSize = size;
			});
		});

		test(`${prefix} compare h1`, (test) => {

			test(`beforeSize.height: ${params.beforeSize.height}`, () => {
				assert(0 < params.beforeSize.height);
			});

			test(`afterSize.height: ${params.afterSize.height}`, () => {
				assert(params.beforeSize.height < params.afterSize.height);
			});

		});

		if (env.BROWSERSTACK) {
			test(`${prefix} report`, (test) => {
				const failedTests = this.children
				.filter(({failed}) => {
					return failed;
				});
				if (failedTests.length === 0) {
					test('mark as "passed"', () => {
						return markResult({
							driver,
							status: 'passed',
						});
					});
				} else {
					test('mark as "failed"', () => {
						return markResult({
							driver,
							status: 'failed',
							reason: `${failedTests[0].error}`,
						});
					});
				}
			});
		}

		test(`${prefix} quit`, () => {
			return driver.quit();
		});

	});
}
