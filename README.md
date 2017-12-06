# sable

[![Build Status](https://travis-ci.org/kei-ito/sable.svg?branch=master)](https://travis-ci.org/kei-ito/sable)
[![Build status](https://ci.appveyor.com/api/projects/status/github/kei-ito/sable?branch=master&svg=true)](https://ci.appveyor.com/project/kei-ito/sable/branch/master)
[![BrowserStack Status](https://www.browserstack.com/automate/badge.svg?badge_key=clRVWTBmQVdFcHNGaDFvMDlxanRoZllsMGN1RU9JNW1CRUtEVjkxQ2NMZz0tLUVMdFpUZnJKajltN0FSTWlJeXBCbVE9PQ==--046a5961a5e492a5b38e13d34a12a6ca2a8c1139)](https://www.browserstack.com/automate/public-build/clRVWTBmQVdFcHNGaDFvMDlxanRoZllsMGN1RU9JNW1CRUtEVjkxQ2NMZz0tLUVMdFpUZnJKajltN0FSTWlJeXBCbVE9PQ==--046a5961a5e492a5b38e13d34a12a6ca2a8c1139)
[![codecov](https://codecov.io/gh/kei-ito/sable/branch/master/graph/badge.svg)](https://codecov.io/gh/kei-ito/sable)
[![dependencies Status](https://david-dm.org/kei-ito/sable/status.svg)](https://david-dm.org/kei-ito/sable)
[![devDependencies Status](https://david-dm.org/kei-ito/sable/dev-status.svg)](https://david-dm.org/kei-ito/sable?type=dev)

Creates a server for development.

## Install

```
npm install sable --save-dev
```

## CLI

```
Usage: sable [options] [documentRoot1, documentRoot2, ...]

+ Command-1 -------------------------------+
| sable \                                  |
|  --listen={host:localhost, port:5000} \  |
|  --ws={port:20000} \                     |
|  /document/root1 \                       |
|  /document/root2                         |
+------------------------------------------+

The Command-1 above runs the Script-1 below.

+ Script-1 --------------------------------+
| new SableServer({                        |
|   listen: {                              |
|     host: 'localhost',                   |
|     port: 5000,                          |
|   },                                     |
|   ws: {port: 20000},                     |
|   documentRoot: [                        |
|     '/document/root1',                   |
|     '/document/root2',                   |
|   ],                                     |
| }).start()                               |
| .catch((error) => {                      |
|   console.error(error);                  |
|   process.exit(1);                       |
| });                                      |
+------------------------------------------+
```

## Javascript API

WIP

### middleware

A middleware is a function which gets 3 arguments `(req, res, next)`.

- `req`: [http.ClientRequest](https://nodejs.org/api/http.html#http_class_http_clientrequest)
- `res`: [http.ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse)
- `next`: A function to escalate the incoming request.

The `middlewares` configuration is sandwiched between
[`watcher`](https://github.com/kei-ito/sable/blob/master/middleware/watcher/index.js)
and
[`staticFile`](https://github.com/kei-ito/sable/blob/master/middleware/staticFile/index.js)
middlewares. i.e. `[a, b, c]` works as `[watcher, a, b, c, staticFile]`.

## License

MIT
