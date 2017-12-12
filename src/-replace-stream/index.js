const {Transform} = require('stream');
const {StringDecoder} = require('string_decoder');
const replacementFunction = require('@nlib/replacement-function');

module.exports = class ReplaceStream extends Transform {

	constructor(replacers, encoding = 'utf-8') {
		super();
		this.decoder = new StringDecoder(encoding);
		this.buffer = '';
		this.replacers = new Set();
		for (const replacer of replacers) {
			if (typeof replacer.pattern === 'string') {
				replacer.pattern = new RegExp(replacer.pattern.replace(/(\W)/g, '\\$1'));
			}
			if (typeof replacer.replacement === 'string') {
				replacer.replacement = replacementFunction(replacer.replacement);
			}
			this.replacers.add(replacer);
		}
	}

	_transform(data, encoding, callback) {
		let text = `${this.buffer}${this.decoder.write(data)}`;
		for (const replacer of this.replacers) {
			const {pattern, replacement, once = true} = replacer;
			while (1) {
				const result = pattern.exec(text);
				if (result) {
					const {index, input} = result;
					this.push(text.slice(0, index));
					this.push(replacement(...result, index, input));
					text = text.slice(index + result[0].length);
					if (once) {
						this.replacers.delete(replacer);
						break;
					}
				} else {
					break;
				}
				pattern.lastIndex = 0;
			}
		}
		this.buffer = text;
		callback();
	}

	_flush(callback) {
		this.push(this.buffer);
		callback();
	}

};
