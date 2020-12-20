import anyTest, {TestInterface, ExecutionContext} from 'ava';
import {URL} from 'url';
import * as http from 'http';
import * as stream from 'stream';
import * as childProcess from 'child_process';
import fetch from 'node-fetch';
import {startServer} from '..';

interface ITextContext {
    process?: childProcess.ChildProcess,
    server?: http.Server,
    start(
        t: ExecutionContext<ITextContext>,
        command: string,
        cwd: string,
    ): Promise<URL>,
}

const test = anyTest as TestInterface<ITextContext>;

test.before(async () => {
    await new Promise((resolve, reject) => {
        childProcess.spawn('npm install', {
            cwd: __dirname,
            shell: true,
        })
        .once('error', reject)
        .once('exit', resolve);
    });
});

test.beforeEach((t) => {
    t.context.start = async (t, command, cwd) => {
        const process = t.context.process = childProcess.spawn(
            `npx ${command}`,
            {cwd, shell: true},
        );
        const localURL = await new Promise<URL>((resolve, reject) => {
            const chunks: Array<Buffer> = [];
            let totalLength = 0;
            const check = (chunk: Buffer) => {
                chunks.push(chunk);
                totalLength += chunk.length;
                const concatenated = Buffer.concat(chunks, totalLength);
                const matched = `${concatenated}`.match(/http:\/\/\S+/);
                if (matched) {
                    resolve(new URL(matched[0]));
                }
            };
            process.stdout.pipe(new stream.Writable({
                write(chunk, _encoding, callback) {
                    check(chunk);
                    callback();
                },
                final(callback) {
                    reject(new Error(`Failed to get a local URL: ${Buffer.concat(chunks, totalLength)}`));
                    callback();
                },
            }));
            process.stderr.pipe(new stream.Writable({
                write(chunk, _encoding, callback) {
                    check(chunk);
                    callback();
                },
            }));
        });
        return localURL;
    };
});

test.afterEach(async (t) => {
    if (t.context.process) {
        t.context.process.kill();
    }
    const {server} = t.context;
    if (server) {
        await new Promise<void>((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
});

let port = 9200;

test('GET /src', async (t) => {
    const localURL = await t.context.start(t, `sable --port ${port++} --host localhost`, __dirname);
    const res = await fetch(new URL('/src', localURL));
    t.is(res.status, 200);
    t.is(res.headers.get('content-type'), 'text/html');
    const html = await res.text();
    t.true(html.includes('<script'));
});

test('GET /', async (t) => {
    const localURL = await t.context.start(t, `sable --port ${port++} --host localhost`, __dirname);
    const res = await fetch(new URL('/', localURL));
    t.is(res.status, 200);
});

test('GET /index.ts', async (t) => {
    t.context.server = await startServer({
        host: 'localhost',
        port: port++,
        documentRoot: __dirname,
    });
    const addressInfo = t.context.server.address();
    if (addressInfo && typeof addressInfo === 'object') {
        const res = await fetch(new URL(`http://localhost:${addressInfo.port}/index.ts`));
        t.is(res.status, 200);
    } else {
        t.is(typeof addressInfo, 'object');
    }
});
