const path = require('path');
const fs = require('fs');
const {PassThrough} = require('stream');
const {URL} = require('url');
const {promisify} = require('util');
const chalk = require('chalk');
const ws = require('ws');
const chokidar = require('chokidar');
const {contentTypes, Injector, writeFileToStream} = require('../util.js');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const autoReloadScriptPath = path.join(__dirname, 'sync.script.js');
const errorHandlerScriptPath = path.join(__dirname, 'console.script.js');

class SnippetInjector extends Injector {
    constructor(params) {
        super({
            pattern: /<!doctype\s+html\s*>\s*/,
            data: `<script src="${params.autoReloadScriptURL}" async></script>\n`,
        });
    }
}

const redirectToIndex = (params, req, res) => {
    res.statusCode = 301;
    res.writeHead(301, {Location: `${req.url}/`});
    res.end();
};

const respondFile = (params, res, filePath) => {
    const type = contentTypes.get(filePath);
    res.writeHead(200, {'Content-Type': type});
    if (type.startsWith('text/html')) {
        fs.createReadStream(filePath).pipe(new SnippetInjector(params)).pipe(res);
    } else {
        fs.createReadStream(filePath).pipe(res);
    }
};

const respondIndex = async (params, res, url, directory) => {
    res.writeHead(200, {'Content-Type': contentTypes.get('index.html')});
    const writer = new PassThrough();
    writer.pipe(new SnippetInjector(params)).pipe(res);
    writer.write('<!doctype html>\n');
    writer.write('<meta charset="utf-8">\n');
    writer.write('<meta name="viewport" content="width=device-width initial-scale=1">\n');
    writer.write(`<title>${url}</title>\n`);
    writer.write('<script>\n');
    await writeFileToStream(writer, errorHandlerScriptPath);
    writer.write('</script>\n');
    writer.write(`<h1>${url}</h1>\n`);
    writer.write('<ul>\n');
    writer.write('<li><a href="..">..</a></li>\n');
    for (const name of await readdir(directory)) {
        writer.write(`<li><a href="${name}">${name}</a></li>\n`);
    }
    writer.write('</ul>\n');
    const now = new Date();
    writer.write(`<p><time datetime="${now.toISOString()}">${now}</time></p>\n`);
    writer.end();
};

const getParams = (options = {}) => ({
    documentRoot: options.documentRoot || process.cwd(),
    baseURL: options.baseURL || 'http://localhost',
    indexFile: options.indexFile || 'index.html',
    autoReloadScriptURL: (options.autoReloadScriptURL || 'autoreload.js').replace(/^\/*/, '/'),
    wss: new ws.Server(options.wss),
    chokidar: {
        ...options.chokidar,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 400,
            pollInterval: 200,
            ...((options.chokidar || {}).awaitWriteFinish || {}),
        },
    },
    silent: Boolean(options.silent),
});

const createWatcher = (params) => chokidar.watch(params.documentRoot, params.chokidar)
.on('all', (event, file) => {
    const data = JSON.stringify({event, file});
    for (const client of params.wss.clients) {
        client.send(data);
    }
});

const onStart = (params) => (server) => {
    server.wss = params.wss;
    if (!params.silent) {
        server.log(`watching ${params.documentRoot}`);
        server.wss.on('connection', (ws, req) => {
            if (server.getVisitorId) {
                const {id} = server.getVisitorId(req);
                server.log(chalk.dim(`Connected: ${id}`));
                ws.on('close', () => {
                    server.log(chalk.dim(`Disconnected: ${id}`));
                });
            }
        });
    }
};

const onClose = (params) => async () => {
    params.watcher.close();
    await new Promise((resolve) => params.wss.close(resolve));
};

exports.staticFile = (options) => {
    const params = getParams(options);
    params.watcher = createWatcher(params);
    return Object.assign(
        async (req, res) => {
            const {pathname} = new URL(req.url, params.baseURL);
            if (pathname === params.autoReloadScriptURL) {
                res.writeHead(200, {'Content-Type': contentTypes.get(autoReloadScriptPath)});
                res.write(`self.wsAddress = ${JSON.stringify(params.wss.address())};\n`);
                fs.createReadStream(autoReloadScriptPath).pipe(res);
            } else {
                const filePath = path.join(params.documentRoot, pathname.replace(/\/$/, `/${params.indexFile}`));
                const isIndex = filePath.endsWith(params.indexFile);
                try {
                    const stats = await stat(filePath);
                    if (stats.isDirectory()) {
                        redirectToIndex(params, req, res);
                    } else {
                        respondFile(params, res, filePath);
                    }
                } catch (error) {
                    if (error.code === 'ENOENT') {
                        if (isIndex) {
                            respondIndex(params, res, req.url, filePath.slice(0, -params.indexFile.length - 1));
                        } else {
                            res.statusCode = 404;
                            res.end();
                        }
                    } else {
                        throw error;
                    }
                }
            }
        },
        {
            onStart: onStart(params),
            onClose: onClose(params),
        },
    );
};
