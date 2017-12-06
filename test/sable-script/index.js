const assert = require('assert');
const console = require('console');
const path = require('path');
const fs = require('fs');
const cp = require('@nlib/cp');
const {Builder, By} = require('selenium-webdriver');
const {Local} = require('browserstack-local');
const packageJSON = require('../../package.json');
const SableServer = require('../../src/-sable-server');
const env = require('../lib/env');
const dateString = require('../lib/date-string');
const directories = require('../lib/directories');
const capabilities = require('../lib/capabilities');
const markResult = require('../lib/mark-result');

const queue = capabilities.slice();
const errors = [];

run()
.then(() => {
	if (0 < errors.length) {
		throw new Error(`${errors.length} capabilities failed`);
	} else {
		console.log('passed: sableScript');
	}
})
.catch((error) => {
	console.error(error);
	process.exit(1);
});

function run() {
	const capability = queue.shift();
	if (!capability) {
		return Promise.resolve();
	}
	const index = capabilities.length - queue.length;
	return testCapability({
		index,
		prefix: `[${index}/${capabilities.length}]`,
		capability,
	})
	.catch((error) => {
		console.error(error);
		capability.error = error;
		errors.push(capability);
	})
	.then(run);
}

function testCapability({capability, prefix, index}) {

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

	console.log(`${prefix} copy ${directories.src} to ${testDirectory}`);
	return cp(directories.src, testDirectory)
	.then(() => {
		console.log(`${prefix} start a server`);
		return server.start();
	})
	.then(() => {
		if (!env.BROWSERSTACK) {
			return Promise.resolve();
		}
		const project = packageJSON.name;
		const build = `${project}#${env.TRAVIS_BUILD_NUMBER || dateString()}`;
		const localIdentifier = (`${prefix}${build}${dateString}`).replace(/[^\w-]/g, '');

		console.log(`${prefix} setup bsLocal`);
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
		})
		.then(() => {
			console.log(`${prefix} wait for bsLocal.isRunning()`);
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
		})
		.then(() => {
			console.log(`${prefix} add some properties`);
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
	})
	.then(() => {
		console.log(`${prefix} create a builder`);
		builder = new Builder().withCapabilities(capability);
		if (env.BROWSERSTACK) {
			console.log(`${prefix} set an endpoint`);
			builder.usingServer('http://hub-cloud.browserstack.com/wd/hub');
		}
		console.log(`${prefix} builder.build()`);
		driver = builder.build();
		console.log(`${prefix} getSession()`);
		return driver.getSession();
	})
	.then((session) => {
		params.session = session;
		console.log(`${prefix} GET /`);
		return Promise.all([
			server.nextWebSocketConnection(({req}) => {
				params.ua0 = req.headers['user-agent'];
				return true;
			}),
			driver.get(`http://127.0.0.1:${server.address().port}/`),
		]);
	})
	.then(() => {
		console.log(`${prefix} change index.html`);
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
	})
	.then(() => {
		console.log(`${prefix} compare requesters`);
		assert.equal(params.ua0, params.ua1);
		console.log(`${prefix} put a value`);
		return driver.executeScript(`window.${params.key} = '${params.key}';`);
	})
	.then(() => {
		console.log(`${prefix} get a value`);
		return driver.executeScript(`return window.${params.key};`);
	})
	.then((returned) => {
		assert.equal(returned, params.key);
		console.log(`${prefix} get h1`);
		return driver.findElement(By.tagName('h1'));
	})
	.then((webElement) => {
		return webElement.getSize();
	})
	.then((size) => {
		params.beforeSize = size;
	})
	.then(() => {
		console.log(`${prefix} change style.css`);
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
	})
	.then(() => {
		console.log(`${prefix} confirm no reload was occurred`);
		return driver.executeScript(`return window.${params.key};`);
	})
	.then((returned) => {
		assert.equal(returned, params.key);
		console.log(`${prefix} wait a while`);
		return driver.sleep(500);
	})
	.then(() => {
		console.log(`${prefix} get h1 again`);
		return driver.findElement(By.tagName('h1'));
	})
	.then((webElement) => {
		return webElement.getSize();
	})
	.then((size) => {
		params.afterSize = size;
		console.log(`beforeSize.height: ${params.beforeSize.height}`);
		assert(0 < params.beforeSize.height);
		console.log(`afterSize.height: ${params.afterSize.height}`);
		assert(params.beforeSize.height < params.afterSize.height);
	})
	.then(() => {
		if (!env.BROWSERSTACK) {
			return Promise.resolve();
		}
		console.log(`${prefix} report`);
		const failedTests = this.children
		.filter(({failed}) => {
			return failed;
		});
		if (failedTests.length === 0) {
			console.log('mark as "passed"');
			return markResult({
				session: params.session,
				driver,
				status: 'passed',
			});
		} else {
			console.log('mark as "failed"');
			return markResult({
				session: params.session,
				status: 'failed',
				reason: `${failedTests[0].error}`,
			});
		}
	})
	.then(() => {
		console.log(`${prefix} quit`);
		return driver.quit();
	})
	.then(() => {
		console.log('close()');
		return server.close();
	})
	.then(() => {
		console.log('closed');
	})
	.catch((error) => {
		if (driver) {
			driver.quit();
		}
		throw error;
	});

}
