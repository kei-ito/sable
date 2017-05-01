const HTTP_INTERNAL_SERVER_ERROR = 500;

function error() {
	return function (req, res) {
		res.statusCode = HTTP_INTERNAL_SERVER_ERROR;
		res.end(`Error: ${req.url}`);
	};
}

module.exports = error;
