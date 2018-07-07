const path = require('path');
const fs = require('fs');
const {PassThrough} = require('stream');
const {promisify} = require('util');
const DateString = require('@nlib/date-string');
const {TemplateString} = require('@nlib/template-string');
const {SnippetInjector} = require('../../-snippet-injector');
const {serveFile} = require('../serve-file');

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const date = new DateString('[YYYY]-[MM]-[DD] [hh]:[mm]:[ss]');
const templates = Promise.all(
	['index.html', 'breadcrumb.html', 'file.html']
	.map(async (templateFileName) => new TemplateString(await readFile(path.join(__dirname, 'template', templateFileName), 'utf8')))
);

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
	const [indexHTML, breadcrumbHTML, fileHTML] = await templates;
	const writer = new PassThrough();
	writer
	.pipe(new SnippetInjector(server))
	.pipe(res);
	writer.end(indexHTML({
		title: req.parsedURL.pathname,
		createdAt: date(startedAt),
		duration: Date.now() - startedAt,
		breadcrumbs: `home${req.parsedURL.pathname}`.split('/')
		.reverse()
		.map(
			(name, index) => (0 < index ? breadcrumbHTML({
				pathname: '../'.repeat(index - 1),
				name,
			}) : name).trim()
		)
		.reverse()
		.join(''),
		files: [
			fileHTML({
				name: '..',
				size: '',
				modifiedAt: '',
				createdAt: '',
			}),
			...results
			.map(({name, stats}) => {
				let {size, atime, birthtime} = stats;
				const isDirectory = stats.isDirectory();
				if (isDirectory) {
					name = `${name}/`;
					size = '';
				}
				atime = date(atime);
				birthtime = date(birthtime);
				return fileHTML({
					name,
					size,
					modifiedAt: atime,
					createdAt: birthtime,
				});
			}),
		]
		.join('\n'),
	}));
};
