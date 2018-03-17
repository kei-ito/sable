exports.getNextPort = function getNextPort(error) {
	switch (error.code) {
	case 'EADDRINUSE':
	case 'EACCES':
		return error.port + 1;
	default:
		return 0;
	}
};
