const assert = require('assert');
const console = require('console');
const {PassThrough} = require('stream');
const ReplaceStream = require('../../src/-replace-stream');

const tests = [
	{
		replacers: [
			{
				pattern: 'a',
				replacement: 'α',
			},
		],
		source: ['abcabc', 'abcabc'],
		expected: 'αbcabcabcabc',
	},
	{
		replacers: [
			{
				pattern: 'a',
				replacement: 'α',
				once: false,
			},
		],
		source: ['abcabc', 'abcabc'],
		expected: 'αbcabcαbcabc',
	},
	{
		replacers: [
			{
				pattern: /\w/g,
				replacement(match) {
					return match.toUpperCase();
				},
			},
		],
		source: ['abcabc', 'abcabc'],
		expected: 'ABCABCabcabc',
	},
	{
		replacers: [
			{
				pattern: /\w/g,
				replacement(match) {
					return match.toUpperCase();
				},
				once: false,
			},
		],
		source: ['abcabc', 'abcabc'],
		expected: 'ABCABCABCABC',
	},
];

Promise.all(
	tests
	.map(({replacers, source, expected}) => {
		const replaceStream = new ReplaceStream(replacers);
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
			assert.equal(actual, expected);
		});
	})
)
.then(() => {
	console.log('passed: ReplaceStream');
})
.catch((error) => {
	console.error(error);
	process.exit(1);
});
