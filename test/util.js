const net = require('net');
const t = require('tap');
const {
	toString,
	getType,
	ContentTypeRegistry,
	contentTypes,
	listen,
	close,
} = require('../lib/util.js');

t.test('toString', (t) => {
	t.equal(toString(), '[object Undefined]');
	t.equal(toString(null), '[object Null]');
	t.equal(toString(0), '[object Number]');
	t.equal(toString('0'), '[object String]');
	t.equal(toString({}), '[object Object]');
	t.equal(toString([]), '[object Array]');
	t.equal(toString(new Error()), '[object Error]');
	t.equal(toString(new TypeError()), '[object Error]');
	t.equal(toString(Symbol('')), '[object Symbol]');
	t.end();
});

t.test('getType', (t) => {
	t.equal(getType(), 'undefined');
	t.equal(getType(null), 'null');
	t.equal(getType(0), 'number');
	t.equal(getType('0'), 'string');
	t.equal(getType({}), 'object');
	t.equal(getType([]), 'array');
	t.equal(getType(new Error()), 'error');
	t.equal(getType(new TypeError()), 'error');
	t.equal(getType(Symbol('')), 'symbol');
	t.end();
});

t.test('ContentTypeRegistry', (t) => {
	const registry = new ContentTypeRegistry();
	t.equal(registry.get('style.css'), 'text/plain');
	registry.defaultContentType = 'text/html';
	t.equal(registry.get('style.css'), 'text/html');
	registry.set('.css', 'text/stylesheet');
	t.equal(registry.get('style.css'), 'text/stylesheet');
	registry.set('.css', 'text/css');
	t.equal(registry.get('style.css'), 'text/css');
	t.end();
});

t.test('contentTypes', (t) => {
	t.equal(contentTypes.get('style.css'), 'text/css');
	t.equal(contentTypes.get('script.js'), 'application/javascript');
	t.equal(contentTypes.get('font.ttf'), 'application/x-font-ttf');
	t.end();
});

t.test('listen/close', async (t) => {
	const port = 12345;
	const server = net.createServer();
	await listen(server, port);
	t.equal(server.address().port, port);
	await close(server);
});
