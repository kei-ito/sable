/* global self */
(function (wsAddress, location, WebSocket) {
	const socket = new WebSocket([
		`ws${location.protocol === 'https:' ? 's' : ''}`,
		`//${location.hostname}`,
		wsAddress.port,
	].join(':'));
	socket.addEventListener('message', () => {
		location.reload();
	});
}(self.wsAddress, self.location, self.WebSocket));
