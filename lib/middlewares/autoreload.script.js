/* global self */
(function () {
	const {wsAddress, location, WebSocket} = self;
	const socket = new WebSocket([
		`ws${location.protocol === 'https:' ? 's' : ''}`,
		`//${location.hostname}`,
		wsAddress.port,
	].join(':'));
	socket.addEventListener('message', () => {
		location.reload();
	});
}());
