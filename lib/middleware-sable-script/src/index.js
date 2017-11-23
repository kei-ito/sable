const port = document.getElementById('sable-wsport').textContent;
const endpoint = `ws://${location.hostname}:${port}`;
const messageElement = document.createElement('div');
messageElement.setAttribute('style', [
	'position: fixed',
	'right: 0',
	'top: 0',
	'max-width: 100px',
	'padding: 4px 8px',
	'margin: 0',
	'font-family: sans-serif',
	'font-size: 12px',
	'color: #fff',
	'background-color: #000',
].join(';'));

function showMessage(message) {
	clearTimeout(messageElement.timer);
	messageElement.textContent = message;
	if (!messageElement.parentNode) {
		document.body.appendChild(messageElement);
		messageElement.timer = setTimeout(() => {
			document.body.removeChild(messageElement);
		}, 3000);
	}
}

function connect(error) {
	if (error) {
		console.error(error);
		showMessage((error.error || error).toString());
	}
	clearTimeout(connect.timer);
	connect.timer = setTimeout(() => {
		const ws = new WebSocket(endpoint);
		ws.onmessage = onMessage;
		ws.onopen = () => {
			connect.count = 0;
			showMessage('connected');
		};
		ws.onerror = () => {
			if (connect.count === 0) {
				showMessage('failed to connect');
			}
			connect();
		};
		ws.onclose = () => {
			if (connect.count === 0) {
				showMessage('disconnected');
			}
			connect();
		};
		connect.count = connect.count || 0;
		showMessage(['connecting', ++connect.count].join(' '));
	}, 1000);
}

function onMessage(event) {
	if (!document.getElementById('sable-index-page') && event.data.replace(/^[^.]*/, '') === '.css') {
		findCSS(event.data);
	} else {
		location.reload();
	}
}

function findCSS(file) {
	const updatedFileFragments = file.split('/');
	const linkElements = document.querySelectorAll('link[rel="stylesheet"]');
	const toBeReplaced = [];
	let i;
	let j;
	let linkElement;
	let fragments;
	for (i = 0; i < linkElements.length; i++) {
		linkElement = linkElements[i];
		fragments = linkElement.getAttribute('href')
		.split(location.host).pop()
		.split('?').shift()
		.split('/');
		if (fragments[0]) {
			fragments.unshift.apply(fragments, location.pathname.split('/').slice(0, -1));
		}
		for (j = 0; j < updatedFileFragments.length; j++) {
			if (linkElement && updatedFileFragments[j] !== fragments[j]) {
				linkElement = null;
				break;
			}
		}
		if (linkElement) {
			toBeReplaced.push(linkElement);
		}
	}
	if (0 < toBeReplaced.length) {
		reloadCSS(
			toBeReplaced,
			updatedFileFragments.join('/') + '?d=' + Date.now()
		);
	}
}

function reloadCSS(currentLinkElements, href) {
	const newLinkElement = document.createElement('link');
	newLinkElement.addEventListener('load', function () {
		while (0 < currentLinkElements.length) {
			document.head.removeChild(currentLinkElements.shift());
		}
	});
	newLinkElement.setAttribute('rel', 'stylesheet');
	newLinkElement.setAttribute('href', href);
	document.head.appendChild(newLinkElement);
}

if (WebSocket) {
	setTimeout(connect);
} else {
	console.error('Watcher failed to start: WebSocket is unavailable.');
}
