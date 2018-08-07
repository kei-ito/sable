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
			port: 23456,
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

	capabilities.forEach((capability) => {
		t.test(JSON.stringify(capability), {timeout}, async (t) => {
			const builder = new Builder().withCapabilities(capability);
			if (env.BROWSERSTACK) {
				builder.usingServer('http://hub-cloud.browserstack.com/wd/hub');
				const project = packageJSON.name;
				const build = `${project}#${env.TRAVIS_BUILD_NUMBER || new Date().toISOString()}`;
				const localIdentifier = (`${build}${new Date().toISOString()}`).replace(/[^\w-]/g, '');
				// https://github.com/browserstack/browserstack-local-nodejs/blob/master/lib/Local.js
				bsLocal = new Local();
				await promisify(bsLocal.start).call(bsLocal, {
					key: env.BROWSERSTACK_ACCESS_KEY,
					verbose: true,
					forceLocal: true,
					onlyAutomate: true,
					only: `localhost,${sableServer.server.address().port},0`,
					localIdentifier,
				});
			}
			driver = builder.build();
			session = await driver.getSession();
			await driver.get(`http://localhost:${sableServer.server.address().port}/`);
			const indexPageURL = await driver.getCurrentUrl();
			t.ok(indexPageURL, indexPageURL);
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
