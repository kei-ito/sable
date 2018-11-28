const chalk = require('chalk');
exports.printResult = ({
    silent = false,
} = {}) => {
    const middleware = (req, res, next, server) => {
        const print = silent
        ? () => {}
        : () => {
            const {statusCode} = res;
            const color = ['green', 'yellow'][Math.floor(statusCode / 100 - 2)] || 'red';
            const message = [];
            if (req.prefix) {
                message.push(req.prefix);
            }
            message.push(`${res.statusCode}`);
            message.push(res.statusMessage);
            server.stdout.write(chalk[color](message.join(' ')));
            server.stdout.write('\n');
        };
        res
        .once('error', print)
        .once('finish', print);
        next();
    };
    return middleware;
};
