(function(){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function setAttribute(element, attrName) {
	for (var _len = arguments.length, value = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
		value[_key - 2] = arguments[_key];
	}

	element.setAttribute(attrName, value.join(' '));
}

function getAttribute(element, attributeName) {
	return element.getAttribute(attributeName);
}

function debounce(fn) {
	var delay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
	var thisArg = arguments[2];

	var timer = void 0;
	return function () {
		var _this = this;

		for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
			args[_key2] = arguments[_key2];
		}

		clearTimeout(timer);
		timer = setTimeout(function () {
			fn.call.apply(fn, [thisArg || _this].concat(args));
		}, delay);
	};
}

var URL = function () {
	function URL(url, baseURL) {
		_classCallCheck(this, URL);

		Object.assign(this, {
			protocol: '',
			host: '',
			hostname: '',
			port: '',
			pathname: '',
			search: '',
			hash: ''
		});
		if (baseURL) {
			if (!(baseURL instanceof URL)) {
				baseURL = new URL(baseURL);
			}
			Object.assign(baseURL, {
				pathname: '',
				search: '',
				hash: ''
			});
			Object.assign(this, baseURL);
		}
		if (url instanceof URL) {
			Object.assign(this, url);
		} else {
			this.parse(url);
		}
	}

	_createClass(URL, [{
		key: 'parse',
		value: function parse(url) {
			var _this2 = this;

			url.replace(/^\w+:/, function (match) {
				_this2.protocol = match;
				return '';
			}).replace(/\/\/([^/\s]+)/, function (match, host) {
				_this2.host = host;
				_this2.hostname = host.replace(/:(\d+)$/, function (match2, port) {
					_this2.port = port;
					return '';
				});
				return '';
			}).replace(/^([^/])/, '/$1').replace(/\/[^?#]+/, function (match) {
				_this2.pathname = match;
				return '';
			}).replace(/\?[^#]+/, function (match) {
				_this2.search = match;
				return '';
			}).replace(/#.*$/, function (match) {
				_this2.hash = match;
				return '';
			});
		}
	}, {
		key: 'toString',
		value: function toString() {
			return this.protocol + '//' + this.host + this.pathname + this.search + this.hash;
		}
	}, {
		key: 'href',
		get: function get() {
			return this.toString();
		}
	}]);

	return URL;
}();

/* global WebSocket */


var RETRY_INTERVAL = 1000;
var endpoint = 'ws://' + location.hostname + ':' + document.getElementById('wsport').textContent;

function replaceCSS(file) {
	var linkElements = document.querySelectorAll('link[rel="stylesheet"]');
	var length = linkElements.length;

	var currentURL = new URL(location.href);
	var href = location.protocol + '//' + location.host + '/' + file;
	for (var i = 0; i < length; i++) {
		var linkElement = linkElements[i];
		var hrefAttr = getAttribute(linkElement, 'href');
		var url = new URL(hrefAttr, currentURL);
		url.search = '';
		url.hash = '';
		if (href === url.toString()) {
			url.search = '?d=' + Date.now();
			setAttribute(linkElement, 'href', url.toString());
		}
	}
}

function onMessage(event) {
	var file = event.data;

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
