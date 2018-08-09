// https://seleniumhq.github.io/selenium/docs/api/javascript/index.html
const path = require('path');
const fs = require('fs');
const os = require('os');
const t = require('tap');
const {promisify} = require('util');
const {Builder, By} = require('selenium-webdriver');
const {Local} = require('browserstack-local');
const {startServer} = require('..');
const {capabilities} = require('./lib/capabilities.js');
const env = require('./lib/env.js');
const {markResult} = require('./lib/markResult.js');
const timeout = 60000;
const mkdtemp = promisify(fs.mkdtemp);
const packageJSON = require('../package.json');
const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
const catchError = (promise) => promise
.then((x) => {
	throw new Error(`Unexpected resolution: ${x}`);
})
.catch((x) => x);
const writeFile = promisify(fs.writeFile);

t.test('Sync', {timeout: timeout * capabilities.length}, (t) => {

	let documentRoot;
	let sableServer;
	let bsLocal;
	let driver;
	let session;
	let status;
	t.beforeEach(async () => {
		status = 'failed';
		documentRoot = await mkdtemp(path.join(os.tmpdir(), 'Sync'));
		sableServer = await startServer({
			port: 8080,
			documentRoot,
		});
	});
	t.afterEach(async () => {
		if (env.BROWSERSTACK) {
			await markResult({session, status});
		}
		await driver.quit();
		await sableServer.close();
		if (bsLocal) {
			await new Promise((resolve) => {
				bsLocal.stop(resolve);
			});
		}
	});

	capabilities.forEach((capability, index) => {
		t.test(`Capability#${index}`, {timeout}, async (t) => {
			t.ok(1, `documentRoot: ${documentRoot}`);
			t.ok(1, `port: ${sableServer.server.address().port}`);
			t.ok(1, `wsport: ${sableServer.wss.address().port}`);
			for (const key of Object.keys(capability)) {
				t.ok(1, `${key}: ${capability[key]}`);
			}
			capability.project = packageJSON.name;
			capability.build = `${capability.project}#${env.TRAVIS_BUILD_NUMBER || new Date().toISOString()}`;
			const localIdentifier = (`${capability.build}${new Date().toISOString()}`).replace(/[^\w-]/g, '');
			if (env.BROWSERSTACK) {
				t.ok(1, 'Create a builder');
				capability['browserstack.local'] = true;
				capability['browserstack.localIdentifier'] = localIdentifier;
				capability['browserstack.user'] = env.BROWSERSTACK_USERNAME;
				capability['browserstack.key'] = env.BROWSERSTACK_ACCESS_KEY;
			}
			const builder = new Builder().withCapabilities(capability);
			t.ok(1, 'Create a builder');
			if (env.BROWSERSTACK) {
				builder.usingServer('http://hub-cloud.browserstack.com/wd/hub');
				bsLocal = new Local();
				t.ok(1, 'Create bsLocal');
				await new Promise((resolve, reject) => {
					bsLocal.start({
						key: env.BROWSERSTACK_ACCESS_KEY,
						verbose: true,
						forceLocal: true,
						onlyAutomate: true,
						only: `localhost,${sableServer.server.address().port},0`,
						localIdentifier,
					}, (error) => {
						if (error) {
							reject(error);
						} else {
							resolve();
						}
					});
				});
				t.ok(1, 'Setup bsLocal');
				await new Promise((resolve, reject) => {
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
				t.ok(1, 'Connect to BrowserStack');
			}
			driver = builder.build();
			t.ok(1, 'Get the driver');
			session = await driver.getSession();
			t.ok(1, 'Get the session');
			await Promise.all([
				new Promise((resolve, reject) => {
					let timer = setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
					const userAgents = [];
					sableServer.wss.once('connection', (client, req) => {
						clearTimeout(timer);
						const userAgent = req.headers['user-agent'];
						t.ok(1, `Connected: ${userAgent}`);
						userAgents.push(userAgent);
						timer = setTimeout(() => resolve(userAgents), 1000);
					});
				}),
				driver.get(`http://127.0.0.1:${sableServer.server.address().port}/`),
			]);
			const indexPageURL = await driver.getCurrentUrl();
			t.ok(indexPageURL, `URL: ${indexPageURL}`);
			t.match(
				await catchError(driver.findElement(By.css('a[href="foo.txt"]'))),
				{name: 'NoSuchElementError'}
			);
			await writeFile(path.join(documentRoot, 'foo.txt'), 'foobar');
			await wait(200);
			t.ok(await driver.findElement(By.css('a[href="foo.txt"]')), 'a[href="foo.txt"]');
			status = 'passed';
		});
	});
	t.end();

});
