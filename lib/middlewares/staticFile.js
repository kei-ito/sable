const path = require('path');
const {Transform, Writable} = require('stream');
const fs = require('fs');
const {promisify} = require('util');
const {StringDecoder} = require('string_decoder');
const {contentTypes} = require('../util.js');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class Injector extends Transform {

	constructor(options) {
		super(options);
		this.decoder = new StringDecoder();
		this.buffer = '';
	}

	_transform(buffer, encoding, callback) {
		if (this.decoder) {
			this.buffer += this.decoder.write(buffer);
			const match = this.buffer.match(/<!doctype\s+html\s*>\s*/);
			if (match) {
				const {input} = match;
				const index = match.index + match[0].length;
				this.push(input.slice(0, index));
				this.push('<script src="/hookun-sync.js" async></script>\n');
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

const redirectToIndex = (req, res) => {
	res.statusCode = 301;
	res.writeHead(301, {Location: `${req.url}/`});
	res.end();
};

const respondFile = (res, filePath) => {
	const type = contentTypes.get(filePath);
	res.writeHead(200, {'Content-Type': type});
	if (type.startsWith('text/html')) {
		fs.createReadStream(filePath).pipe(new Injector()).pipe(res);
	} else {
		fs.createReadStream(filePath).pipe(res);
	}
};

const respondIndex = async (res, url, directory) => {
	res.writeHead(200, {'Content-Type': contentTypes.get('index.html')});
	const writer = new Writable();
	writer.pipe(new Injector()).pipe(res);
	writer.write('<!doctype html>\n');
	writer.write('<meta charset="utf-8">\n');
	writer.write('<meta name="viewport" content="width=device-width initial-scale=1">\n');
	writer.write(`<title>${url}</title>\n`);
	writer.write(`<h1>${url}</h1>\n`);
	writer.write('<ul>\n');
	writer.write('<li><a href="..">..</a></li>\n');
	for (const name of await readdir(directory)) {
		writer.write(`<li><a href="${name}">${name}</a></li>\n`);
	}
	writer.write('</ul>\n');
	const now = new Date();
	writer.write(`<p><time datetime="${now.toISOString()}">${now}</time></p>\n`);
	writer.end();
};

exports.staticFile = ({
	documentRoot = process.cwd(),
	indexFile = 'index.html',
} = {}) => async (req, res) => {
	const filePath = path.join(documentRoot, req.url.replace(/\/$/, `/${indexFile}`));
	const isIndex = filePath.endsWith(indexFile);
	try {
		const stats = await stat(filePath);
		if (stats.isDirectory()) {
			redirectToIndex(req, res);
		} else {
			respondFile(res, filePath);
		}
	} catch (error) {
		if (error.code === 'ENOENT') {
			if (isIndex) {
				respondIndex(res, req.url, filePath.slice(0, -indexFile.length - 1));
			} else {
				res.statusCode = 404;
				res.end();
			}
		}
	}
};
