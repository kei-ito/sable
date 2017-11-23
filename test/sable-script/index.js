// const assert = require('assert');
const path = require('path');
const test = require('@nlib/test');
const cp = require('@nlib/cp');
const {Builder} = require('selenium-webdriver');
const {Local} = require('browserstack-local');
const packageJSON = require('../../package.json');
const SableServer = require('../..');
const env = require('../lib/env');
const dateString = require('../lib/date-string');
const directories = require('../lib/directories');
const capabilities = require('../lib/capabilities');
const capabilityTitle = require('../lib/capability-title');

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
			.then(run);
		}
		return run();
	});

	test('close()', () => {
		return server.close();
	});

});


function testCapability({test, server, capability, prefix}) {

	function localURL(pathname) {
		return `http://127.0.0.1:${server.address().port}${pathname}`;
	}

	return test(`${prefix} ${capabilityTitle(capability)}`, function (test) {

		this.timeout = 30000;

		let bsLocal;
		let builder;
		let driver;

		if (env.BROWSERSTACK) {

			const project = packageJSON.name;
			const build = `${project}#${env.TRAVIS_BUILD_NUMBER || dateString()}`;
			const localIdentifier = `${build}@${dateString}`;

			test('setup bsLocal', function () {
				this.timeout = 30000;
				return new Promise((resolve, reject) => {
					// https://github.com/browserstack/browserstack-local-nodejs/blob/master/lib/Local.js
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

			test('wait for bsLocal.isRunning()', function () {
				this.timeout = 30000;
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

		test(`${prefix} GET ${localURL('/')}`, () => {
			return driver.get(localURL('/'));
		});

		test(`${prefix} quit}`, () => {
			return driver.quit();
		});

	});
}
