const {Transform} = require('stream');
const {StringDecoder} = require('string_decoder');

class ReplaceStream extends Transform {

	constructor(replacers, encoding = 'utf-8') {
		super();
		this.decoder = new StringDecoder(encoding);
		this.replacers = new Set(replacers);
	}

	_transform(data, encoding, callback) {
		let text = this.decoder.write(data);
		for (const replacer of this.replacers) {
			const {pattern, replacement, once = true} = replacer;
			const replaced = text.replace(pattern, replacement);
			if (replaced !== text) {
				text = replaced;
				if (once) {
					this.replacers.delete(replacer);
				}
			}
		}
		this.push(text);
		callback();
	}

}

module.exports = ReplaceStream;
