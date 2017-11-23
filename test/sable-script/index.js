const assert = require('assert');
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
	const session = {};

	test(`copy ${directories.src} to ${testDirectory}`, () => {
		return cp(directories.src, testDirectory);
	});

	test('start a server', () => {
		return server.start();
	});

	test('has a port', () => {
		const {port} = server.address();
		session.port = port;
		session.url = (pathname) => {
			return `http://127.0.0.1:${port}${pathname}`;
		};
		assert(0 < port);
	});

	if (env.BROWSERSTACK) {

		session.project = packageJSON.name;
		session.build = `${session.project}#${env.TRAVIS_BUILD_NUMBER || dateString()}`;
		session.localIdentifier = `${session.build}@${dateString}`;

		test('setup bsLocal', () => {
			return new Promise((resolve, reject) => {
				// https://github.com/browserstack/browserstack-local-nodejs/blob/master/lib/Local.js
				session.bsLocal = new Local();
				session.bsLocal.start(
					{
						key: env.BROWSERSTACK_ACCESS_KEY,
						verbose: true,
						forceLocal: true,
						onlyAutomate: true,
						only: `localhost,${server.address().port},0`,
						localIdentifier: session.local,
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

		test('wait for bsLocal.isRunning', () => {
			return new Promise((resolve) => {
				let count = 0;
				function check() {
					if (session.bsLocal.isRunning()) {
						resolve();
					} else if (count++ < 60) {
						setTimeout(check, 1000);
					} else {
						throw new Error('Failed to start browserstack-local');
					}
				}
				check();
			});
		});

	}

	test('run tests', (test) => {
		const queue = capabilities.slice();
		function run() {
			const capability = queue.shift();
			if (!capability) {
				return Promise.resolve();
			}
			const prefix = `[${capabilities.length - queue.length}/${capabilities.length}]`;
			return test(`${prefix} ${capabilityTitle(capability)}`, (test) => {

				let builder;
				let driver;

				if (env.BROWSERSTACK) {
					test(`${prefix} add some properties`, () => {
						Object.assign(
							capability,
							{
								'project': session.project,
								'build': session.build,
								'browserstack.local': true,
								'browserstack.localIdentifier': session.localIdentifier,
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

				test(`${prefix} GET ${session.url('/')}`, () => {
					return driver.get(session.url('/'));
				});

				test(`${prefix} quit}`, () => {
					return driver.quit();
				});

			})
			.then(run);
		}
		return run();
	});

	test('close()', () => {
		return server.close();
	});

});
