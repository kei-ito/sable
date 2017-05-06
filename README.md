# sable

[![Build Status](https://travis-ci.org/kei-ito/sable.svg?branch=master)](https://travis-ci.org/kei-ito/sable)
[![Code Climate](https://codeclimate.com/github/kei-ito/sable/badges/gpa.svg)](https://codeclimate.com/github/kei-ito/sable)
[![Test Coverage](https://codeclimate.com/github/kei-ito/sable/badges/coverage.svg)](https://codeclimate.com/github/kei-ito/sable/coverage)
[![dependencies Status](https://david-dm.org/kei-ito/sable/status.svg)](https://david-dm.org/kei-ito/sable)

It creates a server for development.

## Install

```sh
npm install sable --save-dev
```

## CLI

```sh
$ sable
$ sable --port 4444
$ sable --port 4444 --documentRoot release
$ sable --port 4444 --documentRoot release --wsport 5000
$ sable --help
Usage: sable [options] [documentRoots ...]

Options:

  -h, --help              output usage information
  -V, --version           output the version number
  -p --port <n>           A port number to which the web server listens
  -w --wsport <n>         A port number to which the websocket server listens
  --documentRoot <paths>  A comma separated list of directories set as documentRoot
```

## Javascript API

```javascript
const SableServer = require('sable');
const server = new SableServer({
  port: 4000,
  wsport: 30000,
  documentRoot: [
    'release',
    'temp'
  ],
  chokidar: {
    ignored: [
      /\/temp\//,
      /\/node_modules\//,
      /\/\.git\//
    ]
  },
  middlewares: [
    function (req, res, next) {
      console.log(req.url);
      next();
    }
  ]
});

```

| option       | default         | description                                                             |
|--------------|-----------------|-------------------------------------------------------------------------|
| port         | `4000`          | A port number to which the web server listens.                          |
| wsport       | `port + 1`      | A port number to which the websocket server listens.                    |
| documentRoot | `process.cwd()` | An array of directories set as documentRoot.                            |
| chokidar     | `undefined`     | An object passed to [chokidar](https://www.npmjs.com/package/chokidar). |
| middlewares  | []              | An array of [middlewares](#middlewares).                                |

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
