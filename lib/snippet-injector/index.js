const ReplaceStream = require('../replace-stream');

class SnippetInjector extends ReplaceStream {

	constructor(server) {
		super([
			{
				pattern: /<!doctype\s+html\s*[^<>]*>/i,
				replacement(match) {
					return [
						match,
						`<script id="sable-wsport" type="text/plain">${server.wsPort}</script>`,
						'<script src="/sable-script.js"></script>',
					].join('\r\n');
				},
			},
		]);
	}

}

module.exports = SnippetInjector;
