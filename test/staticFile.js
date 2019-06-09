const path = require('path');
const http = require('http');
const os = require('os');
const fs = require('fs');
const {promisify} = require('util');
const mkdtemp = promisify(fs.mkdtemp);
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const t = require('tap');
const {Logger, listen, waitResponse, close} = require('../lib/util.js');
const {
    startServer,
    middlewares: {staticFile},
} = require('..');

t.test('staticFile', {timeout: 3000, jobs: 1}, (t) => {
    let sableServer;
    let documentRoot;
    const autoReloadScriptURL = '/foobar.js';
    const port = 8080;
    t.beforeEach(async () => {
        documentRoot = await mkdtemp(path.join(os.tmpdir(), 'staticFile'));
        await mkdir(path.join(documentRoot, 'foo'));
        await writeFile(path.join(documentRoot, 'foo/index.html'), '<!doctype html>foo');
        await writeFile(path.join(documentRoot, 'foo/bar.txt'), 'foobar');
        const server = http.createServer();
        const wsServer = http.createServer();
        await Promise.all([
            listen(server, port),
            listen(wsServer, port + 1),
        ]);
        sableServer = await startServer({
            server,
            middlewares: [
                staticFile({
                    documentRoot,
                    wss: {server: wsServer},
                    chokidar: [documentRoot],
                    autoReloadScriptURL,
                }),
            ],
        });
        sableServer.wsServer = wsServer;
    });
    t.afterEach(async () => {
        await sableServer.close();
        await close(sableServer.wsServer);
    });
    t.test(autoReloadScriptURL, async (t) => {
        const res = await waitResponse(http.get(`http://127.0.0.1:${port}${autoReloadScriptURL}`));
        t.equal(res.statusCode, 200);
        t.match(res.headers, {'content-type': 'application/javascript'});
        const body = await res.pipe(new Logger()).promise();
        t.ok(`${body}`.startsWith('self.wsAddress'));
    });
    t.test('index', async (t) => {
        const res = await waitResponse(http.get(`http://127.0.0.1:${port}/`));
        t.equal(res.statusCode, 200);
        t.equal(res.headers['content-type'], 'text/html');
        const body = `${await res.pipe(new Logger()).promise()}`;
        t.ok(body.includes('a href=".."'));
        t.ok(body.includes('a href="foo"'));
    });
    t.test('redirect', async (t) => {
        const res = await waitResponse(http.get(`http://127.0.0.1:${port}/foo`));
        t.equal(res.statusCode, 301);
        t.equal(res.headers.location, '/foo/');
    });
    t.test('foo/index.html', async (t) => {
        const res = await waitResponse(http.get(`http://127.0.0.1:${port}/foo/`));
        t.equal(res.statusCode, 200);
        t.equal(res.headers['content-type'], 'text/html');
        const body = `${await res.pipe(new Logger()).promise()}`;
        t.ok(body.startsWith('<!doctype html>'));
        t.ok(body.endsWith('foo'));
    });
    t.test('foo/bar.txt', async (t) => {
        const res = await waitResponse(http.get(`http://127.0.0.1:${port}/foo/bar.txt`));
        t.equal(res.statusCode, 200);
        t.equal(res.headers['content-type'], 'text/plain');
        const body = `${await res.pipe(new Logger()).promise()}`;
        t.equal(body, 'foobar');
    });
    t.test('404', async (t) => {
        const res = await waitResponse(http.get(`http://127.0.0.1:${port}/foo/baz.txt`));
        t.equal(res.statusCode, 404);
    });
    t.end();
});
