const path = require('path');
const promisify = require('j1/promisify');
const changeExt = require('j1/changeExt');
const glob = promisify(require('glob'));
const {rollup} = require('rollup');
const builtins = require('rollup-plugin-node-builtins');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const rollupBuble = require('rollup-plugin-buble');

function rollupFile(filePath) {
	return rollup({
		entry: filePath,
		plugins: [
			builtins(),
			nodeResolve(),
			commonjs({include: path.join(__dirname, '..', 'node_modules')}),
			rollupBuble(),
			{
				intro: function () {
					return [
						'// sable watcher',
						'window.global = window;'
					].join('\n');
				}
			}
		]
	})
	.then((bundle) => {
		return bundle.write({
			format: 'cjs',
			dest: changeExt(filePath, '.js')
		});
	});
}

function rollupFiles(...args) {
	return glob(...args)
	.then((files) => {
		return Promise.all(files.map(rollupFile));
	});
}

module.exports = rollupFiles;
