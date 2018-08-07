const middlewares = Object.assign(
	require('./middlewares/staticFile.js')
);
Object.assign(
	exports,
	require('./SableServer.js'),
	require('./util.js'),
	{middlewares}
);
