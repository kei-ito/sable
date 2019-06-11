import * as http from 'http';
import * as connect from 'connect';
import * as staticLivereload from 'middleware-static-livereload';

export interface ISableOptions {
    documentRoot?: string | Array<string>,
    port?: number,
    host?: string,
    index?: string,
    noWatch?: boolean,
}

export const startServer = ({
    documentRoot = process.cwd(),
    port = 4000,
    host,
    index = 'index.html',
    noWatch = false,
}: ISableOptions = {}): Promise<http.Server> => new Promise((resolve, reject) => {
    const app = connect();
    app.use(staticLivereload.middleware({
        documentRoot,
        index,
        watch: !noWatch,
    }));
    const server = http.createServer(app);
    server.once('listening', () => {
        const addressInfo = server.address();
        if (addressInfo && typeof addressInfo === 'object') {
            const {address, family, port} = addressInfo;
            const portSuffix = port === 80 ? '' : `:${port}`;
            const hostname = host || (portSuffix && family === 'IPv6' ? `[${address}]` : address);
            process.stdout.write(`http://${hostname}${portSuffix}\n`);
        }
        resolve(server);
    });
    const listen = (port: number, host?: string) => {
        server
        .once('error', (error: Error & {code: string}) => {
            if (error.code === 'EADDRINUSE') {
                listen(port + 1, host);
            } else {
                reject(error);
            }
        })
        .listen(port, host);
    };
    listen(port, host);
});
