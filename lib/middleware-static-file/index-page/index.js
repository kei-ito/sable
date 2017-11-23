const path = require('path');
const fs = require('fs');
const {PassThrough} = require('stream');
const promisify = require('@nlib/promisify');
const humanReadable = require('@nlib/human-readable');
const DateString = require('@nlib/date-string');
const ContentType = require('@nlib/content-type');
const TemplateString = require('@nlib/template-string');
const stat = promisify(fs.stat, fs);
const readdir = promisify(fs.readdir, fs);
const readFile = promisify(fs.readFile, fs);

const SnippetInjector = require('../../snippet-injector');
const serveFile = require('../serve-file');
const contentType = new ContentType();
const date = new DateString('[YYYY]-[MM]-[DD] [hh]:[mm]:[ss]');

function indexPage(directoryPath, req, res, server) {
	const startedAt = Date.now();
	return readdir(directoryPath)
	.then((fileNames) => {
		return Promise.all(
			fileNames
			.map((name) => {
				const filePath = path.join(directoryPath, name);
				return stat(filePath)
				.then((stats) => {
					return {name, filePath, stats};
				});
			})
		);
	})
	.then((results) => {
		const indexFile = results
		.find(({filePath, stats}) => {
			return stats.isFile() && contentType.get(filePath) === contentType.get('.html');
		});
		if (indexFile) {
			return serveFile(indexFile.filePath, req, res, server);
		}
		const writer = new PassThrough();
		res.writeHead(200, {
			'content-type': contentType.get('.html'),
		});
		return Promise.all(
			[
				path.join(__dirname, 'template', 'index.html'),
				path.join(__dirname, 'template', 'breadcrumb.html'),
				path.join(__dirname, 'template', 'file.html'),
			]
			.map((templateFilePath) => {
				return readFile(templateFilePath, 'utf8')
				.then((template) => {
					return new TemplateString(template);
				});
			})
		)
		.then(([indexHTML, breadcrumbHTML, fileHTML]) => {
			return new Promise((resolve, reject) => {
				res.writeHead(200, {
					'content-type': 'text/html',
				});
				writer
				.pipe(new SnippetInjector(server))
				.pipe(res)
				.once('error', reject)
				.once('finish', resolve);
				writer.end(indexHTML({
					title: req.parsedURL.pathname,
					createdAt: date(startedAt),
					duration: Date.now() - startedAt,
					breadcrumbs: `home${req.parsedURL.pathname}`.split('/')
					.reverse()
					.map((name, index) => {
						return (0 < index ? breadcrumbHTML({
							pathname: '../'.repeat(index - 1),
							name,
						}) : name).trim();
					})
					.reverse()
					.join(''),
					files: [
						fileHTML({
							name: '..',
							size: 'n/a',
							modifiedAt: 'n/a',
							createdAt: 'n/a',
						}),
						...results
						.map(({name, stats}) => {
							let {size, atime, birthtime} = stats;
							const isDirectory = stats.isDirectory();
							if (isDirectory) {
								name = `${name}/`;
								size = 'n/a';
							} else {
								size = req.parsedURL.query.raw ? size : humanReadable(size);
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
			});
		});
	});
}

module.exports = indexPage;
