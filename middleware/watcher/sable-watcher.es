/* global document, location, WebSocket */
import url from 'url';
const RETRY_INTERVAL = 1000;
const CHECKLOAD_INTERVAL = 300;
const endpoint = `ws://${location.hostname}:${document.getElementById('wsport').textContent}`;

function debounce(fn, delay = 0, thisArg = this) {
	let timer = null;
	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(function () {
			fn.call(thisArg, ...args);
		}, delay);
	};
}

function currentLocation() {
	return location.pathname.replace(/\/$/, '/index.html');
}

function currentDir() {
	return currentLocation()
	.replace(/\/[^/]+/, '');
}

function reloadPage() {
	location.reload();
}

function checkCSSLoad(link, onload) {
	function check() {
		if (link.parentNode) {
			if (link.sheet && 0 < link.sheet.cssRules.length) {
				onload();
			} else {
				setTimeout(check, CHECKLOAD_INTERVAL);
			}
		}
	}
	check();
}

function findElement(file, query, attrName, fn) {
	const dir = currentDir();
	const elements = document.querySelectorAll(query);
	const {length} = elements;
	for (let i = 0; i < length; i += 1) {
		const script = elements[i];
		const {pathname} = url.parse(`${dir}/${script.getAttribute(attrName)}`.replace(/\/\//g, '/'));
		if (pathname === file) {
			fn(script);
			break;
		}
	}
}

function replaceCSS(file) {
	findElement(file, 'link[rel="stylesheet"]', 'href', function (cssLink) {
		const newLink = document.createElement('link');
		const newHref = cssLink.getAttribute('href').replace(/(\?.*)?$/, `?d=${Date.now()}`);
		newLink.setAttribute('href', newHref);
		newLink.setAttribute('rel', 'stylesheet');
		cssLink.parentNode.appendChild(newLink);
		checkCSSLoad(newLink, function () {
			cssLink.parentNode.removeChild(cssLink);
		});
	});
}

function reloadJS(file) {
	findElement(file, 'script[src]', 'src', reloadPage);
}

function reloadHTML(file) {
	const currentUrl = location.pathname.replace(/\/$/, '/index.html');
	if (currentUrl === file) {
		reloadPage();
	}
}

function onMessage(event) {
	const {data: file} = event;
	switch (file.replace(/^.*\.([\w]+)$/, '$1')) {
	case 'css':
		replaceCSS(file);
		break;
	case 'js':
		reloadJS(file);
		break;
	case 'html':
		reloadHTML(file);
		break;
	default:
		reloadPage();
	}
}

const connect = debounce(function () {
	const ws = new WebSocket(endpoint);
	if (this && this.close) {
		this.close();
	}
	ws.onmessage = onMessage;
	ws.onerror = connect;
	ws.onclose = connect;
}, RETRY_INTERVAL);

connect();
