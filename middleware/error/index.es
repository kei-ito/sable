function error() {
	return function (req, res) {
		res.statusCode = 404;
		res.end();
	};
}

module.exports = error;
