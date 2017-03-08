/* global document, location, WebSocket */
const ws = new WebSocket(`ws://${location.hostname}:${document.getElementById('wsport').textContent}`);
ws.onmessage = function (event) {
	console.log(event);
};
