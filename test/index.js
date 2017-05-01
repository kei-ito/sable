const SableServer = require('..');

describe('SableServer', function () {

	it('should start a server', function () {
		const server = new SableServer();
		return server.listen(4000);
	});

});
