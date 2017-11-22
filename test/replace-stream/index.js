const assert = require('assert');
const {PassThrough} = require('stream');
const test = require('@nlib/test');
const ReplaceStream = require('../../lib/replace-stream');

test('ReplaceStream', (test) => {

	[
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
	]
	.forEach(({replacers, source, expected}) => {
		const title = `${JSON.stringify(source.join(''))} → ${JSON.stringify(expected)}`;
		const replaceStream = new ReplaceStream(replacers);
		test(title, () => {
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
		});
	});

});
