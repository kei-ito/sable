const fs = require('fs');
const buble = require('buble');
const promisify = require('j1/promisify');
const changeExt = require('j1/changeExt');
const writeFile = require('j1/writeFile');
const console = require('j1/console').create('transpile');
const glob = promisify(require('glob'));
const readFile = promisify(fs.readFile, fs);

function transpileFile(file) {
	console.debug(`reading: ${file}`);
	return readFile(file, 'utf8')
	.then((code) => {
		return buble.transform(code);
	})
	.then(({code}) => {
		console.debug(`transpiled: ${file}`);
		return writeFile(changeExt(file, '.js'), code);
	});
}

function transpile(...args) {
	return glob(...args)
	.then((files) => {
		return Promise.all(files.map(transpileFile));
	});
}

module.exports = transpile;
