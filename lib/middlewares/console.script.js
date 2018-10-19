(function (addEventListener, document, console) {
    const getBody = function (callback) {
        if (document.body) {
            callback(document.body);
        } else {
            setTimeout(function () {
                getBody(callback);
            }, 100);
        }
    };
    const pre = document.createElement('pre');
    getBody(function (body) {
        body.insertBefore(pre, body.firstChild);
    });
    const print = function (message) {
        const line = document.createElement('div');
        line.textContent = message;
        pre.insertBefore(line, pre.firstChild);
    };
    const printError = function (error) {
        print([
            'Error: ' + (error.stack || error.message || error),
            'at ' + error.filename + ' ' + error.lineno + ':' + error.colno,
        ].join('\n'));
    };
    addEventListener('error', printError);
    const log = console.log;
    console.log = function () {
        log.apply(console, arguments);
        for (let i = 0; i < arguments.length; i++) {
            print(arguments[i]);
        }
    };
    console.info = console.log;
    console.error = console.log;
}(self.addEventListener, self.document, self.console));
