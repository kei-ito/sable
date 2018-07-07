const {Transform} = require('stream');
const {StringDecoder} = require('string_decoder');

exports.SnippetInjector = class SnippetInjector extends Transform {

	constructor(server) {
		super();
		this.server = server;
		this.decoder = new StringDecoder();
		this.buffer = [];
	}

	_transform(chunk, encoding, callback) {
		if (this.decoder) {
			this.buffer.push(chunk);
			const source = this.decoder.write(chunk);
			const match = source.match(/(<!doctype\s+html\s*[^<>]*>)/i);
			if (match) {
				const {0: matched, index} = match;
				const before = Buffer.from(`${source.slice(0, index)}${matched}`);
				this.push(before);
				this.push(Buffer.from(`\r\n<script id="sable-wsport" type="text/plain">${this.server.wsPort}</script>`));
				this.push(Buffer.from('\r\n<script src="/sable-script.js"></script>'));
				this.push(Buffer.concat(this.buffer).slice(before.length));
				this.clear();
			}
		} else {
			this.push(chunk);
		}
		callback();
	}

	_flush(callback) {
		if (this.decoder) {
			this.push(Buffer.concat(this.buffer));
			this.clear();
		}
		callback();
	}

	clear() {
		delete this.decoder;
		delete this.buffer;
		return this;
	}

};
