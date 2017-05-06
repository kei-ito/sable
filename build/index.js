const path = require('path');
const projectRoot = path.join(__dirname, '..');
const console = require('j1/console').create('build');
const transpile = require('./transpile');

Promise.all(
	[
		{
			entry: path.join(projectRoot, 'middleware', 'watcher', 'polyfill.src.js'),
			dest: path.join(projectRoot, 'middleware', 'watcher', 'sable-polyfill.js')
		},
		{
			entry: path.join(projectRoot, 'middleware', 'watcher', 'watcher.src.js'),
			dest: path.join(projectRoot, 'middleware', 'watcher', 'sable-watcher.js')
		}
	]
	.map(transpile)
).catch(console.onError);
