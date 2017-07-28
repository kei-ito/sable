import {
	debounce,
	location,
	document,
	WebSocket,
	console
} from 'j0';
import URL from 'j0/URL/j0polyfill';

function replaceCSS(file) {
	const linkElements = document.querySelectorAll('link[rel="stylesheet"]');
	const baseURL = new URL(location);
	baseURL.pathname = '';
	baseURL.search = '';
	baseURL.hash = '';
	const fileURL = new URL(file, baseURL);
	fileURL.search = '';
	fileURL.hash = '';
	const {href} = fileURL;
	for (let i = 0; i < linkElements.length; i++) {
		const linkElement = linkElements[i];
		const hrefAttr = linkElement.getAttribute('href');
		const url = new URL(hrefAttr, location);
		url.search = '';
		url.hash = '';
		console.log(href, url.href, href === url.href);
		if (href === url.href) {
			url.search = `?d=${Date.now()}`;
			linkElement.setAttribute('href', url.href);
		}
	}
}

function onMessage(event) {
	const {data: file} = event;
	console.log(`Watcher received: ${file}`);
	switch (file.replace(/^.*\.([\w]+)$/, '$1')) {
	case 'css':
		replaceCSS(file);
		break;
	default:
		location.reload();
	}
}

if (WebSocket) {
	const RETRY_INTERVAL = 1000;
	const endpoint = `ws://${location.hostname}:${document.getElementById('wsport').textContent}`;
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
} else {
	console.info('Watcher failed to start: WebSocket is undefined');
}

