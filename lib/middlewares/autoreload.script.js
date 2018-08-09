(function (wsAddress, console, location, WebSocket) {
	const url = [
		'ws' + (location.protocol === 'https:' ? 's' : ''),
		'//' + location.hostname,
		wsAddress.port,
	].join(':');
	console.log('conneting: ' + url);
	const socket = new WebSocket(url);
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
