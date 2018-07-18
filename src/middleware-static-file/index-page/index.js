const path = require('path');
const fs = require('fs');
const {PassThrough} = require('stream');
const {promisify} = require('util');
const {SnippetInjector} = require('../../-snippet-injector');
const {serveFile} = require('../serve-file');

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

const headerHTML = `
<!doctype html>
<meta charset="utf-8">
<style id="sable-index-page">
* {
	margin: 0;
	padding: 0;
	border-collapse: collapse;
	font: inherit;
	text-decoration: none;
	text-align: left;
}
body {
	font-family: sans-serif;
}
body>* {
	margin: 16px;
}
h1 {
	font-size: 18px;
	font-weight: bold;
}
h1>a::before {
	content: '/';
}
td, th {
	border: solid 1px #ddd;
	padding: 4px 10px;
}
.size {
	text-align: right;
}
</style>
`.trimLeft();

exports.indexPage = async (directoryPath, req, res, server) => {
	const startedAt = Date.now();
	const results = await Promise.all(
		(await readdir(directoryPath))
		.map((name) => {
			const filePath = path.join(directoryPath, name);
			return stat(filePath).then((stats) => ({name, filePath, stats}));
		})
	);
	const {contentType, indexFileName = 'index.html'} = server;
	const htmlContentType = contentType.get('index.html');
	const indexFile = results.find(
		({filePath, stats}) => stats.isFile()
		&& filePath.endsWith(indexFileName)
		&& contentType.get(filePath) === htmlContentType
	);
	if (indexFile) {
		serveFile(indexFile.filePath, req, res, server);
		return;
	}
	res.writeHead(200, {'content-type': htmlContentType});
	const writer = new PassThrough();
	writer
	.pipe(new SnippetInjector(server))
	.pipe(res);
	writer.write(headerHTML);
	writer.write(`<title>${req.parsedURL.pathname}</title>`);
	writer.write('<h1>');
	writer.write(
		`home${req.parsedURL.pathname}`
		.split('/')
		.reverse()
		.map((name, index) => (0 < index ? `<a href="${'../'.repeat(index - 1)}">${name}</a>` : name))
		.reverse()
		.join('')
	);
	writer.write('</h1>');
	writer.write('<table>');
	const files = [
		{
			name: '..',
			size: '',
			modifiedAt: '',
			createdAt: '',
		},
		...results
		.map(({name, stats}) => {
			let {size} = stats;
			if (stats.isDirectory()) {
				name = `${name}/`;
				size = '';
			}
			return {
				name,
				size,
				modifiedAt: new Date(stats.atime).toISOString(),
				createdAt: new Date(stats.birthtime).toISOString(),
			};
		}),
	];
	for (const {name, size, modifiedAt, createdAt} of files) {
		writer.write('<tr>');
		writer.write(`<th><a href="${name}">${name}</a></th>`);
		writer.write(`<td class="size">${size}</td>`);
		writer.write(`<td>${modifiedAt}</td>`);
		writer.write(`<td>${createdAt}</td>`);
		writer.write('</tr>');
	}
	writer.write('</table>');
	writer.write(`<footer>Created at ${new Date().toISOString()} (${Date.now() - startedAt}ms)</footer>`);
	writer.end();
};
