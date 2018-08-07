/* global self */
(function (wsAddress, console, location, WebSocket) {
	const socket = new WebSocket([
		`ws${location.protocol === 'https:' ? 's' : ''}`,
		`//${location.hostname}`,
		wsAddress.port,
	].join(':'));
	socket.addEventListener('open', () => {
		console.info('autoreload connected');
	});
	socket.addEventListener('close', () => {
		console.info('autoreload disconnected');
	});
	socket.addEventListener('message', () => {
		location.reload();
	});
}(self.wsAddress, self.console, self.location, self.WebSocket));
