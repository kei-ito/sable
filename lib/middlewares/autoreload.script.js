(function (wsAddress, console, location, WebSocket) {
	const socket = new WebSocket([
		`ws${location.protocol === 'https:' ? 's' : ''}`,
		`//${location.hostname}`,
		wsAddress.port,
	].join(':'));
	socket.addEventListener('open', function () {
		console.info('autoreload connected');
	});
	socket.addEventListener('close', function () {
		console.info('autoreload disconnected');
	});
	socket.addEventListener('message', function () {
		location.reload();
	});
}(self.wsAddress, self.console, self.location, self.WebSocket));
