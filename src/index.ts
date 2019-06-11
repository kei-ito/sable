import * as http from 'http';
import * as connect from 'connect';
import {staticLivereload} from 'middleware-static-livereload';

export interface ISableOptions {
    documentRoot?: string | Array<string>,
    port?: number,
    index?: string,
    noWatch?: boolean,
}

export const startServer = ({
    documentRoot = process.cwd(),
    port = 4000,
    index = 'index.html',
    noWatch = false,
}: ISableOptions = {}): Promise<http.Server> => new Promise((resolve, reject) => {
    const server = http.createServer(
        connect()
        .use(staticLivereload({
            documentRoot,
            index,
            watch: !noWatch,
        })),
    )
    .once('error', reject)
    .once('listening', () => {
        server.removeListener('error', reject);
        process.stdout.write(`Listening: ${JSON.stringify(server.address())}`);
        resolve(server);
    })
    .listen(port);
});
