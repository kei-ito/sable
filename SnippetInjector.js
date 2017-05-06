const {Transform} = require('stream');
const {StringDecoder} = require('string_decoder');

function getScript(wsport) {
	return [
		`<script id="wsport" type="text/plain">${wsport}</script>`,
		'<script>window.global = window</script>',
		'<script src="/sable-polyfill.js"></script>',
		'<script src="/sable-watcher.js"></script>'
	].join('\n');
}

function append(match) {
	return `${match}\n${getScript(this.wsport)}`;
}

function prepend(match) {
	return `${getScript(this.wsport)}\n${match}`;
}

class SnippetInjector extends Transform {

	constructor({wsport, encoding}) {
		super();
		this.decoder = new StringDecoder(encoding);
		this.watching = true;
		this.wsport = wsport;
		this.patterns = [
			{
				regex: /<meta/i,
				fn: prepend
			},
			{
				regex: /<!doctype.*?>/i,
				fn: append
			}
		];
	}

	_transform(data, encoding, callback) {
		let html = this.decoder.write(data);
		if (this.watching) {
			this.patterns.find(({regex, fn}) => {
				let found = false;
				html = html.replace(regex, (match) => {
					found = true;
					this.watching = false;
					return fn.call(this, match);
				});
				return found;
			});
		}
		this.push(html);
		callback();
	}

}

Object.assign(SnippetInjector, {
	append,
	prepend
});

module.exports = SnippetInjector;
