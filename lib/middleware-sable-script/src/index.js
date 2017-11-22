const RETRY_INTERVAL = 1000;
const port = document.getElementById('sable-wsport').textContent;
const endpoint = `ws://${location.hostname}:${port}`;
let timer;

function connect() {
	clearTimeout(timer);
	timer = setTimeout(() => {
		const ws = new WebSocket(endpoint);
		ws.onmessage = onMessage;
		ws.onerror = connect;
		ws.onclose = connect;
	}, RETRY_INTERVAL);
}

function onMessage(event) {
	console.log(`Watcher received: ${event.data}`);
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
	connect();
} else {
	console.error('Watcher failed to start: WebSocket is unavailable.');
}
