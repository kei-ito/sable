# Sable

[![CircleCI](https://circleci.com/gh/kei-ito/sable.svg?style=svg)](https://circleci.com/gh/kei-ito/sable)
[![Build Status](https://travis-ci.com/kei-ito/sable.svg?branch=master)](https://travis-ci.com/kei-ito/sable)
[![Build status](https://ci.appveyor.com/api/projects/status/github/kei-ito/sable?branch=master&svg=true)](https://ci.appveyor.com/project/kei-ito/sable/branch/master)
[![codecov](https://codecov.io/gh/kei-ito/sable/branch/master/graph/badge.svg)](https://codecov.io/gh/kei-ito/sable)

Starts a server for development.

## Install

```
npm install sable --save-dev
```

## CLI

```
$ sable -h
Usage: sable [options] <documentRoot ...>

Starts a HTTP server for development

Options:
  -V, --version    output the version number
  -p, --port <n>   A port number for HTTP, HTTPS (4000)
  -h, --host <s>   Hostname
  --noWatch        Disable watching
  -i, --index <s>  A filename of index (index.html)
  -h, --help       output usage information
```

## Javascript API

```javascript
import {startServer} from 'sable';
startServer({/* options */})
.then((server) => console.log(server.address()))
```

### Options

`startServer` supports all of the options provided by [middleware-static-livereload]
, `port`, `host` and `middlewares`.

```javascript
interface SableOptions extends MiddlewareStaticLivereload.Options {
    /**
     * The first argument of server.listen()
     * https://nodejs.org/api/net.html#net_server_listen_port_host_backlog_callback
     * @default 4000
     */
    port?: number,
    /**
     * The second argument of server.listen()
     * https://nodejs.org/api/net.html#net_server_listen_port_host_backlog_callback
     * @default undefined
     */
    host?: string,
    /**
     * A list of middlewares.
     * @default []
     */
    middlewares?: Array<connect.HandleFunction>,
}
```

[middleware-static-livereload]: https://github.com/kei-ito/middleware-static-livereload#options

## LICENSE

The sable project is licensed under the terms of the Apache 2.0 License.
