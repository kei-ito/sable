(function(){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function debounce(fn) {
	var delay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
	var thisArg = arguments[2];

	var timer = void 0;
	return function () {
		var _this = this;

		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		clearTimeout(timer);
		timer = setTimeout(function () {
			fn.call.apply(fn, [thisArg || _this].concat(args));
		}, delay);
	};
}

var x = URL;

var x$1 = Object;

function isUndefined(x) {
	return typeof x === 'undefined';
}

var x$2 = encodeURIComponent;

/* eslint-disable no-undefined, complexity, max-statements, max-lines */
/* eslint-disable no-magic-numbers, no-continue, no-labels, no-lonely-if */
// https://github.com/webcomponents/URL
var EOF = undefined;
var ALPHA = /[a-zA-Z]/;
var ALPHANUMERIC = /[a-zA-Z0-9+\-.]/;

var relative = x$1.create(null);
x$1.assign(relative, {
	ftp: 21,
	file: 0,
	gopher: 70,
	http: 80,
	https: 443,
	ws: 80,
	wss: 443
});

var relativePathDotMapping = x$1.create(null);
x$1.assign(relative, {
	'%2e': '.',
	'.%2e': '..',
	'%2e.': '..',
	'%2e%2e': '..'
});

function isRelativeScheme(scheme) {
	return !isUndefined(relative[scheme]);
}

function invalid() {
	clear.call(this);
	this._isInvalid = true;
}

function IDNAToASCII(h) {
	if (h === '') {
		invalid.call(this);
	}
	return h.toLowerCase();
}

function percentEscape(c) {
	var unicode = c.charCodeAt(0);
	if (unicode > 0x20 && unicode < 0x7F &&
	// " # < > ? `
	![0x22, 0x23, 0x3C, 0x3E, 0x3F, 0x60].includes(unicode)) {
		return c;
	}
	return x$2(c);
}

function percentEscapeQuery(c) {
	// XXX This actually needs to encode c using encoding and then convert the bytes one-by-one.
	var unicode = c.charCodeAt(0);
	if (unicode > 0x20 && unicode < 0x7F &&
	// " # < > ` (do not escape '?')
	![0x22, 0x23, 0x3C, 0x3E, 0x60].includes(unicode)) {
		return c;
	}
	return x$2(c);
}

function parse(input, stateOverride, base) {
	var state = stateOverride || 'scheme start';
	var cursor = 0;
	var buffer = '';
	var seenAt = false;
	var seenBracket = false;
	var errors = [];
	function err(message) {
		errors.push(message);
	}

	loop: while ((input[cursor - 1] !== EOF || cursor === 0) && !this._isInvalid) {
		var c = input[cursor];
		switch (state) {
			case 'scheme start':
				if (c && ALPHA.test(c)) {
					// ASCII-safe
					buffer += c.toLowerCase();
					state = 'scheme';
				} else if (stateOverride) {
					err('Invalid scheme.');
					break loop;
				} else {
					buffer = '';
					state = 'no scheme';
					continue;
				}
				break;
			case 'scheme':
				if (c && ALPHANUMERIC.test(c)) {
					// ASCII-safe
					buffer += c.toLowerCase();
				} else if (c === ':') {
					this._scheme = buffer;
					buffer = '';
					if (stateOverride) {
						break loop;
					}
					if (isRelativeScheme(this._scheme)) {
						this._isRelative = true;
					}
					if (this._scheme === 'file') {
						state = 'relative';
					} else if (this._isRelative && base && base._scheme === this._scheme) {
						state = 'relative or authority';
					} else if (this._isRelative) {
						state = 'authority first slash';
					} else {
						state = 'scheme data';
					}
				} else if (!stateOverride) {
					buffer = '';
					cursor = 0;
					state = 'no scheme';
					continue;
				} else if (c === EOF) {
					break loop;
				} else {
					err('Code point not allowed in scheme: ' + c);
					break loop;
				}
				break;
			case 'scheme data':
				if (c === '?') {
					this._query = '?';
					state = 'query';
				} else if (c === '#') {
					this._fragment = '#';
					state = 'fragment';
				} else {
					// XXX error handling
					if (c !== EOF && c !== '\t' && c !== '\n' && c !== '\r') {
						this._schemeData += percentEscape(c);
					}
				}
				break;
			case 'no scheme':
				if (!base || !isRelativeScheme(base._scheme)) {
					err('Missing scheme.');
					invalid.call(this);
				} else {
					state = 'relative';
					continue;
				}
				break;
			case 'relative or authority':
				if (c === '/' && input[cursor + 1] === '/') {
					state = 'authority ignore slashes';
				} else {
					err('Expected /, got: ' + c);
					state = 'relative';
					continue;
				}
				break;
			case 'relative':
				this._isRelative = true;
				if (this._scheme !== 'file') {
					this._scheme = base._scheme;
				}
				if (c === EOF) {
					this._host = base._host;
					this._port = base._port;
					this._path = base._path.slice();
					this._query = base._query;
					this._username = base._username;
					this._password = base._password;
					break loop;
				} else if (c === '/' || c === '\\') {
					if (c === '\\') {
						err('\\ is an invalid code point.');
					}
					state = 'relative slash';
				} else if (c === '?') {
					this._host = base._host;
					this._port = base._port;
					this._path = base._path.slice();
					this._query = '?';
					this._username = base._username;
					this._password = base._password;
					state = 'query';
				} else if (c === '#') {
					this._host = base._host;
					this._port = base._port;
					this._path = base._path.slice();
					this._query = base._query;
					this._fragment = '#';
					this._username = base._username;
					this._password = base._password;
					state = 'fragment';
				} else {
					var nextC = input[cursor + 1];
					var nextNextC = input[cursor + 2];
					if (this._scheme !== 'file' || !ALPHA.test(c) || nextC !== ':' && nextC !== '|' || nextNextC !== EOF && nextNextC !== '/' && nextNextC !== '\\' && nextNextC !== '?' && nextNextC !== '#') {
						this._host = base._host;
						this._port = base._port;
						this._username = base._username;
						this._password = base._password;
						this._path = base._path.slice();
						this._path.pop();
					}
					state = 'relative path';
					continue;
				}
				break;
			case 'relative slash':
				if (c === '/' || c === '\\') {
					if (c === '\\') {
						err('\\ is an invalid code point.');
					}
					if (this._scheme === 'file') {
						state = 'file host';
					} else {
						state = 'authority ignore slashes';
					}
				} else {
					if (this._scheme !== 'file') {
						this._host = base._host;
						this._port = base._port;
						this._username = base._username;
						this._password = base._password;
					}
					state = 'relative path';
					continue;
				}
				break;

			case 'authority first slash':
				if (c === '/') {
					state = 'authority second slash';
				} else {
					err('Expected \'/\', got: ' + c);
					state = 'authority ignore slashes';
					continue;
				}
				break;

			case 'authority second slash':
				state = 'authority ignore slashes';
				if (c !== '/') {
					err('Expected \'/\', got: ' + c);
					continue;
				}
				break;
			case 'authority ignore slashes':
				if (c !== '/' && c !== '\\') {
					state = 'authority';
					continue;
				} else {
					err('Expected authority, got: ' + c);
				}
				break;
			case 'authority':
				if (c === '@') {
					if (seenAt) {
						err('@ already seen.');
						buffer += '%40';
					}
					seenAt = true;
					for (var i = 0, _buffer = buffer, length = _buffer.length; i < length; i++) {
						var cp = buffer[i];
						if (cp === '\t' || cp === '\n' || cp === '\r') {
							err('Invalid whitespace in authority.');
							continue;
						}
						// XXX check URL code points
						if (cp === ':' && this._password === null) {
							this._password = '';
							continue;
						}
						var tempC = percentEscape(cp);
						if (this._password === null) {
							this._username += tempC;
						} else {
							this._password += tempC;
						}
					}
					buffer = '';
				} else if (c === EOF || c === '/' || c === '\\' || c === '?' || c === '#') {
					cursor -= buffer.length;
					buffer = '';
					state = 'host';
					continue;
				} else {
					buffer += c;
				}
				break;
			case 'file host':
				if (c === EOF || c === '/' || c === '\\' || c === '?' || c === '#') {
					if (buffer.length === 2 && ALPHA.test(buffer[0]) && (buffer[1] === ':' || buffer[1] === '|')) {
						state = 'relative path';
					} else if (buffer.length === 0) {
						state = 'relative path start';
					} else {
						this._host = IDNAToASCII.call(this, buffer);
						buffer = '';
						state = 'relative path start';
					}
					continue;
				} else if (c === '\t' || c === '\n' || c === '\r') {
					err('Invalid whitespace in file host.');
				} else {
					buffer += c;
				}
				break;
			case 'host':
			case 'hostname':
				if (c === ':' && !seenBracket) {
					// XXX host parsing
					this._host = IDNAToASCII.call(this, buffer);
					buffer = '';
					state = 'port';
					if (stateOverride === 'hostname') {
						break loop;
					}
				} else if (c === EOF || c === '/' || c === '\\' || c === '?' || c === '#') {
					this._host = IDNAToASCII.call(this, buffer);
					buffer = '';
					state = 'relative path start';
					if (stateOverride) {
						break loop;
					}
					continue;
				} else if ('\t' !== c && '\n' !== c && '\r' !== c) {
					if (c === '[') {
						seenBracket = true;
					} else if (c === ']') {
						seenBracket = false;
					}
					buffer += c;
				} else {
					err('Invalid code point in host/hostname: ' + c);
				}
				break;
			case 'port':
				if (/[0-9]/.test(c)) {
					buffer += c;
				} else if (c === EOF || c === '/' || c === '\\' || c === '?' || c === '#' || stateOverride) {
					if (buffer !== '') {
						var temp = parseInt(buffer, 10);
						if (temp !== relative[this._scheme]) {
							this._port = '' + temp;
						}
						buffer = '';
					}
					if (stateOverride) {
						break loop;
					}
					state = 'relative path start';
					continue;
				} else if (c === '\t' || c === '\n' || c === '\r') {
					err('Invalid code point in port: ' + c);
				} else {
					invalid.call(this);
				}
				break;
			case 'relative path start':
				if (c === '\\') {
					err('\'\\\' not allowed in path.');
				}
				state = 'relative path';
				if (c !== '/' && c !== '\\') {
					continue;
				}
				break;
			case 'relative path':
				if (c === EOF || c === '/' || c === '\\' || !stateOverride && (c === '?' || c === '#')) {
					if (c === '\\') {
						err('\\ not allowed in relative path.');
					}
					var tmp = relativePathDotMapping[buffer.toLowerCase()];
					if (tmp) {
						buffer = tmp;
					}
					if (buffer === '..') {
						this._path.pop();
						if (c !== '/' && c !== '\\') {
							this._path.push('');
						}
					} else if (buffer === '.' && c !== '/' && c !== '\\') {
						this._path.push('');
					} else if (buffer !== '.') {
						if (this._scheme === 'file' && this._path.length === 0 && buffer.length === 2 && ALPHA.test(buffer[0]) && buffer[1] === '|') {
							buffer = buffer[0] + ':';
						}
						this._path.push(buffer);
					}
					buffer = '';
					if (c === '?') {
						this._query = '?';
						state = 'query';
					} else if (c === '#') {
						this._fragment = '#';
						state = 'fragment';
					}
				} else if (c !== '\t' && c !== '\n' && c !== '\r') {
					buffer += percentEscape(c);
				}
				break;
			case 'query':
				if (!stateOverride && c === '#') {
					this._fragment = '#';
					state = 'fragment';
				} else if (c !== EOF && c !== '\t' && c !== '\n' && c !== '\r') {
					this._query += percentEscapeQuery(c);
				}
				break;
			case 'fragment':
				if (c !== EOF && c !== '\t' && c !== '\n' && c !== '\r') {
					this._fragment += c;
				}
				break;
			default:
		}
		cursor++;
	}
}

function clear() {
	this._scheme = '';
	this._schemeData = '';
	this._username = '';
	this._password = null;
	this._host = '';
	this._port = '';
	this._path = [];
	this._query = '';
	this._fragment = '';
	this._isInvalid = false;
	this._isRelative = false;
}

var URL$1 = function () {
	function URL$1(url, base) {
		_classCallCheck(this, URL$1);

		if (!isUndefined(base) && !(base instanceof URL$1)) {
			base = new URL$1(String(base));
		}
		url = String(url);
		this._url = url;
		clear.call(this);
		var input = url.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, '');
		// encoding = encoding || 'utf-8'
		parse.call(this, input, null, base);
	}

	_createClass(URL$1, [{
		key: 'toString',
		value: function toString() {
			return this.href;
		}
	}, {
		key: 'href',
		get: function get() {
			if (this._isInvalid) {
				return this._url;
			}
			var authority = '';
			if (this._username !== '' || this._password !== null) {
				authority = '' + this._username + (this._password === null ? '' : ':' + this._password) + '@';
			}
			var host = this._isRelative ? '//' + authority + this.host : '';
			return '' + this.protocol + host + this.pathname + this._query + this._fragment;
		},
		set: function set(href) {
			clear.call(this);
			parse.call(this, href);
		}
	}, {
		key: 'protocol',
		get: function get() {
			return this._scheme + ':';
		},
		set: function set(protocol) {
			if (this._isInvalid) {
				return;
			}
			parse.call(this, protocol + ':', 'scheme start');
		}
	}, {
		key: 'host',
		get: function get() {
			if (this._isInvalid) {
				return '';
			}
			return this._port ? this._host + ':' + this._port : this._host;
		},
		set: function set(host) {
			if (this._isInvalid || !this._isRelative) {
				return;
			}
			parse.call(this, host, 'host');
		}
	}, {
		key: 'hostname',
		get: function get() {
			return this._host;
		},
		set: function set(hostname) {
			if (this._isInvalid || !this._isRelative) {
				return;
			}
			parse.call(this, hostname, 'hostname');
		}
	}, {
		key: 'username',
		get: function get() {
			return this._username;
		}
	}, {
		key: 'password',
		get: function get() {
			return this._password;
		}
	}, {
		key: 'port',
		get: function get() {
			return this._port;
		},
		set: function set(port) {
			if (this._isInvalid || !this._isRelative) {
				return;
			}
			parse.call(this, port, 'port');
		}
	}, {
		key: 'pathname',
		get: function get() {
			if (this._isInvalid) {
				return '';
			}
			return this._isRelative ? '/' + this._path.join('/') : this._schemeData;
		},
		set: function set(pathname) {
			if (this._isInvalid || !this._isRelative) {
				return;
			}
			this._path = [];
			parse.call(this, pathname, 'relative path start');
		}
	}, {
		key: 'search',
		get: function get() {
			return this._isInvalid || !this._query || this._query === '?' ? '' : this._query;
		},
		set: function set(search) {
			if (this._isInvalid || !this._isRelative) {
				return;
			}
			this._query = '?';
			if (search[0] === '?') {
				search = search.slice(1);
			}
			parse.call(this, search, 'query');
		}
	}, {
		key: 'hash',
		get: function get() {
			return this._isInvalid || !this._fragment || this._fragment === '#' ? '' : this._fragment;
		},
		set: function set(hash) {
			if (this._isInvalid) {
				return;
			}
			this._fragment = '#';
			if (hash[0] === '#') {
				hash = hash.slice(1);
			}
			parse.call(this, hash, 'fragment');
		}
	}, {
		key: 'origin',
		get: function get() {
			if (this._isInvalid || !this._scheme) {
				return '';
			}
			// javascript: Gecko returns String(""), WebKit/Blink String("null")
			// Gecko throws error for "data://"
			// data: Gecko returns "", Blink returns "data://", WebKit returns "null"
			// Gecko returns String("") for file: mailto:
			// WebKit/Blink returns String("SCHEME://") for file: mailto:
			switch (this._scheme) {
				case 'data':
				case 'file':
				case 'javascript':
				case 'mailto':
					return 'null';
				default:
			}
			if (!this.host) {
				return '';
			}
			return this._scheme + '://' + this.host + '}';
		}
	}]);

	return URL$1;
}();

x$1.defineProperties(URL$1, {
	createObjectURL: { value: x.createObjectURL },
	revokeObjectURL: { value: x.revokeObjectURL }
});

/* eslint-disable no-console */
/* global WebSocket */
var RETRY_INTERVAL = 1000;
var endpoint = 'ws://' + location.hostname + ':' + document.getElementById('wsport').textContent;
var baseURL = new URL$1(location);
baseURL.pathname = '';
baseURL.search = '';
baseURL.hash = '';

function replaceCSS(file) {
	var linkElements = document.querySelectorAll('link[rel="stylesheet"]');
	var fileURL = new URL$1(file, baseURL);
	fileURL.search = '';
	fileURL.hash = '';
	var href = fileURL.href;

	for (var i = 0; i < linkElements.length; i++) {
		var linkElement = linkElements[i];
		var hrefAttr = linkElement.getAttribute('href');
		var url = new URL$1(hrefAttr, location);
		url.search = '';
		url.hash = '';
		console.log(href, url.href, href === url.href);
		if (href === url.href) {
			url.search = '?d=' + Date.now();
			linkElement.setAttribute('href', url.href);
		}
	}
}

function onMessage(event) {
	var file = event.data;

	console.log('Watcher received: ' + file);
	switch (file.replace(/^.*\.([\w]+)$/, '$1')) {
		case 'css':
			replaceCSS(file);
			break;
		default:
			location.reload();
	}
}

var connect = debounce(function () {
	var ws = new WebSocket(endpoint);
	if (this && this.close) {
		this.close();
	}
	ws.onmessage = onMessage;
	ws.onerror = connect;
	ws.onclose = connect;
}, RETRY_INTERVAL);
connect();
}())
