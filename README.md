# sable

[![Build Status](https://travis-ci.org/kei-ito/sable.svg?branch=master)](https://travis-ci.org/kei-ito/sable)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/f1a8a21fbb504968a095dbd6e1b01cbb)](https://www.codacy.com/app/kei.itof/sable?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=kei-ito/sable&amp;utm_campaign=Badge_Grade)
[![Codacy Badge](https://api.codacy.com/project/badge/Coverage/f1a8a21fbb504968a095dbd6e1b01cbb)](https://www.codacy.com/app/kei.itof/sable?utm_source=github.com&utm_medium=referral&utm_content=kei-ito/sable&utm_campaign=Badge_Coverage)
[![dependencies Status](https://david-dm.org/kei-ito/sable/status.svg)](https://david-dm.org/kei-ito/sable)
[![devDependencies Status](https://david-dm.org/kei-ito/sable/dev-status.svg)](https://david-dm.org/kei-ito/sable?type=dev)

It creates a server for development.

## Install

```sh
npm install sable --save-dev
```

## CLI

```sh
$ sable
$ sable --port 4444
$ sable --port 4444 release
$ sable --port 4444 --wsport 5000 release
$ sable --help
Usage: sable [options] [documentRoot1, documentRoot2, ...]

Options:

  -h, --help              output usage information
  -V, --version           output the version number
  -p --port <n>           A port number to which the web server listens
  -w --wsport <n>         A port number to which the websocket server listens
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
