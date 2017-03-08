/* global document, location, WebSocket */
function debounce(fn, delay = 0, thisArg = this) {
	let timer = null;
	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(function () {
			fn.call(thisArg, ...args);
		}, delay);
	};
}
const RETRY_INTERVAL = 1000;
const endpoint = `ws://${location.hostname}:${document.getElementById('wsport').textContent}`;
const connect = debounce(function () {
	const ws = new WebSocket(endpoint);
	if (this && this.close) {
		this.close();
	}
	ws.onmessage = function (event) {
		console.log(event);
	};
	ws.onerror = connect;
	ws.onclose = connect;
}, RETRY_INTERVAL);
connect();
