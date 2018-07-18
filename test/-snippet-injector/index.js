const t = require('tap');
const {PassThrough} = require('stream');
const {SnippetInjector} = require('../../src/-snippet-injector');

const tests = [
	{
		server: {wsPort: 4000},
		source: ['<!doctype html>'],
		expected: [
			'<!doctype html>',
			'<script id="sable-wsport" type="text/plain">4000</script>',
			'<script src="/sable-script.js"></script>',
		].join('\r\n'),
	},
	{
		server: {wsPort: 4000},
		source: ['<!doctype htm>'],
		expected: '<!doctype htm>',
	},
	{
		server: {wsPort: 4000},
		source: [
			'<!DOCTYPE HTML P "-//W//D H 4.01 T//E" "h://w.w3.o/T/h/l.d">\n<head>',
		],
		expected: [
			'<!DOCTYPE HTML P "-//W//D H 4.01 T//E" "h://w.w3.o/T/h/l.d">',
			'<script id="sable-wsport" type="text/plain">4000</script>',
			'<script src="/sable-script.js"></script>\n<head>',
		].join('\r\n'),
	},
];

t.test('SnippetInjector', (t) => {
	for (const {server, source, expected} of tests) {
		t.test(source, (t) => {
			const replaceStream = new SnippetInjector(server);
			return new Promise((resolve, reject) => {
				const writer = new PassThrough();
				const chunks = [];
				let length = 0;
				writer
				.pipe(replaceStream)
				.once('error', reject)
				.on('data', (chunk) => {
					chunks.push(chunk);
					length += chunk.length;
				})
				.once('end', () => {
					resolve(Buffer.concat(chunks, length).toString());
				});
				source
				.reduce((promise, source) => {
					return promise
					.then(() => {
						writer.write(source);
						return new Promise((resolve) => {
							setTimeout(resolve, 50);
						});
					});
				}, Promise.resolve())
				.then(() => {
					writer.end();
				});
			})
			.then((actual) => {
				t.equal(actual, expected);
			});
		});
	}
	t.end();
});
