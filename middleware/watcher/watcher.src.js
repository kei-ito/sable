/* global WebSocket */
import Date from 'j0/Date';
import setAttribute from 'j0/dom/setAttribute';
import getAttribute from 'j0/dom/getAttribute';
import document from 'j0/document';
import location from 'j0/location';
import debounce from 'j0/debounce';
import URL from './URL';

const RETRY_INTERVAL = 1000;
const endpoint = `ws://${location.hostname}:${document.getElementById('wsport').textContent}`;

function replaceCSS(file) {
	const linkElements = document.querySelectorAll('link[rel="stylesheet"]');
	const {length} = linkElements;
	const currentURL = new URL(location.href);
	const href = `${location.protocol}//${location.host}/${file}`;
	for (let i = 0; i < length; i++) {
		const linkElement = linkElements[i];
		const hrefAttr = getAttribute(linkElement, 'href');
		const url = new URL(hrefAttr, currentURL);
		url.search = '';
		url.hash = '';
		if (href === url.toString()) {
			url.search = `?d=${Date.now()}`;
			setAttribute(linkElement, 'href', url.toString());
		}
	}
}

function onMessage(event) {
	const {data: file} = event;
	switch (file.replace(/^.*\.([\w]+)$/, '$1')) {
	case 'css':
		replaceCSS(file);
		break;
	default:
		location.reload();
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
