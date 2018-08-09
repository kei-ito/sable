(function (wsAddress, console, location, WebSocket) {
	const url = [
		'ws' + (location.protocol === 'https:' ? 's' : ''),
		'//' + location.hostname,
		wsAddress.port,
	].join(':');
	console.log('connecting: ' + url);
	const socket = new WebSocket(url);
	socket.addEventListener('open', function () {
		console.info('connected: ' + url);
	});
	socket.addEventListener('close', function () {
		console.info('disconnected: ' + url);
	});
	socket.addEventListener('message', function () {
		location.reload();
	});
}(self.wsAddress, self.console, self.location, self.WebSocket));
