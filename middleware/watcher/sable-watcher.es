/* global document, location, WebSocket */
import path from 'path';
const RETRY_INTERVAL = 1000;
const RELOAD_DEBOUNCE = 300;
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

function checkLoad(link, onload) {
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

function replaceCSS(file) {
	const cssPath = path.relative(path.dirname(location.pathname), `/${file}`);
	const link = document.querySelector(`link[href^=${JSON.stringify(cssPath)}]`);
	if (link) {
		const newLink = document.createElement('link');
		const newHref = link.getAttribute('href').replace(/(\?.*)?$/, `?d=${Date.now()}`);
		newLink.setAttribute('href', newHref);
		newLink.setAttribute('rel', 'stylesheet');
		link.parentNode.appendChild(newLink);
		checkLoad(newLink, function () {
			link.parentNode.removeChild(link);
		});
	}
}
const connect = debounce(function () {
	const ws = new WebSocket(endpoint);
	if (this && this.close) {
		this.close();
	}
	ws.onmessage = debounce(function (event) {
		const file = event.data;
		const ext = file.replace(/^.*\./, '');
		switch (ext) {
		case 'css':
			replaceCSS(file);
			break;
		default:
			location.reload();
		}
	}, RELOAD_DEBOUNCE);
	ws.onerror = connect;
	ws.onclose = connect;
}, RETRY_INTERVAL);
connect();
