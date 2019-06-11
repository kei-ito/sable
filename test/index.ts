import anyTest, {TestInterface} from 'ava';
import {URL} from 'url';
import * as http from 'http';
import * as stream from 'stream';
import * as childProcess from 'child_process';

interface ITextContext {
    process?: childProcess.ChildProcess,
    start(
        command: string,
        cwd: string,
    ): Promise<URL>,
}

const test = anyTest as TestInterface<ITextContext>;
const get = (url: URL): Promise<http.IncomingMessage> => new Promise((resolve, reject) => {
    http.get(`${url}`)
    .once('response', resolve)
    .once('error', reject);
});
const readStream = (readable: stream.Readable): Promise<Buffer> => new Promise((resolve, reject) => {
    const chunks: Array<Buffer> = [];
    let totalLength = 0;
    readable.pipe(new stream.Writable({
        write(chunk, _encoding, callback) {
            chunks.push(chunk);
            totalLength += chunk.length;
            callback();
        },
        final(callback) {
            resolve(Buffer.concat(chunks, totalLength));
            callback();
        },
    }))
    .once('error', reject);
});

test.before(async (t) => {
    await new Promise((resolve, reject) => {
        childProcess.spawn('npm install', {
            cwd: __dirname,
            shell: true,
        })
        .once('error', reject)
        .once('exit', resolve);
    });
    t.context.start = async (command, cwd) => {
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
                t.log([`${concatenated}`]);
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
                    reject(new Error('Failed to get a local URL'));
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

test.afterEach((t) => {
    if (t.context.process) {
        t.context.process.kill();
    }
});

test.serial('GET /src', async (t) => {
    const localURL = await t.context.start('sable', __dirname);
    const indexResponse = await get(new URL('/src', localURL));
    t.is(indexResponse.statusCode, 200);
    t.is(indexResponse.headers['content-type'], 'text/html');
    const html = `${await readStream(indexResponse)}`;
    t.true(html.includes('<script'));
});
