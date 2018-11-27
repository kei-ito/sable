# sable

[![Greenkeeper badge](https://badges.greenkeeper.io/kei-ito/sable.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/kei-ito/sable.svg?branch=master)](https://travis-ci.org/kei-ito/sable)
[![Build status](https://ci.appveyor.com/api/projects/status/github/kei-ito/sable?branch=master&svg=true)](https://ci.appveyor.com/project/kei-ito/sable/branch/master)
[![BrowserStack Status](https://www.browserstack.com/automate/badge.svg?badge_key=TUd4dDNqUlljR2EvZkkyZkRvU2U5YzRQR01Rc3EvM2JKdmRrelZnMi9IUT0tLVc1K3ViMjVMUHJJUm1hOTM5STdGVGc9PQ==--24bb94d7fbf503d93397fc9d8610dce7b616b47f)](https://www.browserstack.com/automate/public-build/TUd4dDNqUlljR2EvZkkyZkRvU2U5YzRQR01Rc3EvM2JKdmRrelZnMi9IUT0tLVc1K3ViMjVMUHJJUm1hOTM5STdGVGc9PQ==--24bb94d7fbf503d93397fc9d8610dce7b616b47f)
[![codecov](https://codecov.io/gh/kei-ito/sable/branch/master/graph/badge.svg)](https://codecov.io/gh/kei-ito/sable)

Creates a server for development.

## Install

```
npm install sable --save-dev
```

## CLI

```
$ sable -h

  Usage: sable [options] <documentRoot>

  Starts a HTTP server for development

  Options:

    -V, --version           output the version number
    -p, --port <n>          A port number for HTTP, HTTPS (4000)
    -w, --wsport <n>        A port number for WS, WSS (port + 1)
    -b, --base <s>          An URL used as the 2nd argument of the URL constructor (http://localhost)
    -i, --index <s>         A filename of index (index.html)
    -a, --reloadscript <s>  An URL for autoreload script (autoreload.js)
    -h, --help              output usage information
```

## Javascript API

WIP

## License

MIT
