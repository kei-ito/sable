const path = require('path');
const console = require('j1/console').create('build');

const transpile = require('./transpile.es');
const rollup = require('./rollup.es');

const projectRoot = path.join(__dirname, '..');
const watcherPath = path.join(projectRoot, 'middleware', 'watcher', 'sable-watcher.es');

Promise.all([
	transpile(path.join(projectRoot, '**', '*.es'), {
		nodir: true,
		ignore: [
			path.join(projectRoot, 'node_modules', '**', '*'),
			path.join(projectRoot, 'build', '**', '*'),
			watcherPath
		]
	}),
	rollup(watcherPath)
])
.catch(console.onError);
