const path = require('path');
const fs = require('fs');
const {Writable} = require('stream');
const {Transform} = require('stream');
const {StringDecoder} = require('string_decoder');

class Logger extends Writable {

	constructor(...args) {
		super(...args);
		this.written = [];
		this.total = 0;
		this.deferred = new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
	}

	_write(chunk, encoding, callback) {
		this.total += chunk.length;
		this.written.push(chunk);
		callback();
	}

	_final(callback) {
		this.resolve(this.concat());
		callback();
	}

	concat() {
		return Buffer.concat(this.written, this.total);
	}

	promise() {
		return this.deferred;
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
	if (!server.address()) {
		resolve();
	}
	server.close()
	.once('error', reject)
	.once('close', () => {
		server.removeListener('error', reject);
		resolve(server);
	});
});

const waitResponse = (req) => new Promise((resolve, reject) => {
	const onError = (error) => {
		req.removeListener('response', onResponse);
		reject(error);
	};
	const onResponse = (res) => {
		req.removeListener('error', onError);
		resolve(res);
	};
	req
	.once('error', onError)
	.once('response', onResponse);
});

class Injector extends Transform {

	constructor({pattern, data}) {
		super();
		this.pattern = pattern;
		this.data = data;
		this.decoder = new StringDecoder();
		this.buffer = '';
	}

	_transform(buffer, encoding, callback) {
		if (this.decoder) {
			this.buffer += this.decoder.write(buffer);
			const match = this.buffer.match(this.pattern);
			if (match) {
				const {input} = match;
				const index = match.index + match[0].length;
				this.push(input.slice(0, index));
				this.push(this.data);
				this.push(input.slice(index));
				this.push(this.decoder.end());
				delete this.buffer;
				delete this.decoder;
			} else {
				this.buffer = buffer;
			}
		} else {
			this.push(buffer);
		}
		callback();
	}

}

const writeFileToStream = (writable, filepath) => new Promise((resolve, reject) => {
	fs.createReadStream(filepath)
	.pipe(new Writable({
		write(chunk, encoding, callback) {
			writable.write(chunk);
			callback();
		},
		final(callback) {
			resolve();
			callback();
		},
	}))
	.once('error', reject);
});

Object.assign(exports, {
	Logger,
	toString,
	getType,
	ContentTypeRegistry,
	contentTypes,
	listen,
	close,
	waitResponse,
	Injector,
	writeFileToStream,
});
