const assert = require('assert');
const test = require('@nlib/test');
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
		expected: 'αbcαbcαbcαbc',
	},
	{
		replacers: [
			{
				pattern: 'abc',
				replacement: 'αβγ',
				once: false,
			},
		],
		source: ['ab', 'ca', 'bc', 'ab', 'ca', 'bc'],
		expected: 'αβγαβγαβγαβγ',
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
		expected: 'Abcabcabcabc',
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

test('ReplaceStream', (test) => {
	for (const {replacers, source, expected} of tests) {
		test(JSON.stringify(replacers), () => {
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
		});
	}
});
