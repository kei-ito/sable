const path = require('path');
const {Writable} = require('stream');

class Logger extends Writable {

	constructor(...args) {
		super(...args);
		this.written = [];
	}

	_write(chunk, encoding, callback) {
		this.written.push(chunk);
		callback();
	}

	concat() {
		return Buffer.concat(this.written);
	}

}

const toString = (x) => Object.prototype.toString.call(x);
const getType = (x) => toString(x).slice(8, -1).toLowerCase();

class ContentTypeRegistry {

	constructor() {
		this.registry = new Map();
		this.defaultContentType = 'text/plain';
	}

	set(extname, contentType) {
		this.registry.set(extname, contentType);
	}

	get(filePath) {
		const extName = path.extname(filePath);
		return this.registry.get(extName) || this.defaultContentType;
	}

}

const contentTypes = new ContentTypeRegistry();
contentTypes.set('.html', 'text/html');
contentTypes.set('.js', 'application/javascript');
contentTypes.set('.css', 'text/css');
contentTypes.set('.json', 'application/json');
contentTypes.set('.jpg', 'image/jpeg');
contentTypes.set('.jpeg', 'image/jpeg');
contentTypes.set('.png', 'image/png');
contentTypes.set('.gif', 'image/gif');
contentTypes.set('.svg', 'image/svg+xml');
contentTypes.set('.ico', 'image/vnd.microsoft.icon');
contentTypes.set('.woff', 'application/font-woff');
contentTypes.set('.otf', 'application/x-font-otf');
contentTypes.set('.ttf', 'application/x-font-ttf');
contentTypes.set('.pdf', 'application/pdf');
contentTypes.set('.zip', 'application/zip');
contentTypes.set('.webm', 'video/webm');
contentTypes.set('.mp4', 'video/mp4');
contentTypes.set('.mp3', 'audio/mpeg');
contentTypes.set('.wav', 'audio/wav');
contentTypes.set('.ogg', 'audio/ogg');

const listen = (server, ...args) => new Promise((resolve, reject) => {
	server.listen(...args)
	.once('error', reject)
	.once('listening', () => {
		server.removeListener('error', reject);
		resolve(server);
	});
});

const close = (server) => new Promise((resolve, reject) => {
	server.close()
	.once('error', reject)
	.once('close', () => {
		server.removeListener('error', reject);
		resolve(server);
	});
});

Object.assign(exports, {
	Logger,
	toString,
	getType,
	ContentTypeRegistry,
	contentTypes,
	listen,
	close,
});
