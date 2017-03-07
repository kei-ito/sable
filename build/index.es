const path = require('path');
const fs = require('fs');
const buble = require('buble');
const promisify = require('j1/promisify');
const changeExt = require('j1/changeExt');
const writeFile = require('j1/writeFile');
const console = require('j1/console').create('build');
const glob = promisify(require('glob'));
const readFile = promisify(fs.readFile, fs);

const projectRoot = path.join(__dirname, '..');

function transpile(file) {
	return readFile(file, 'utf8')
	.then((code) => {
		return buble.transform(code);
	})
	.then(({code}) => {
		return writeFile(changeExt(file, '.js'), code);
	});
}

glob(path.join(projectRoot, '**', '*.es'), {
	nodir: true,
	ignore: [
		path.join(projectRoot, 'node_modules', '**', '*')
	]
})
.then((files) => {
	return Promise.all(files.map(transpile));
})
.catch(console.onError);
