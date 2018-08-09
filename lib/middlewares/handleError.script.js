(function (addEventListener, document) {
	const getBody = function (callback) {
		if (document.body) {
			callback(document.body);
		} else {
			setTimeout(function () {
				getBody(callback);
			}, 100);
		}
	};
	const printError = function (error) {
		getBody(function (body) {
			const pre = document.createElement('pre');
			pre.textContent = [
				'Error: ' + (error.stack || error.message || error),
				'at ' + error.filename + ' ' + error.lineno + ':' + error.colno,
			].join('\n');
			body.insertBefore(pre, body.firstChild);
		});
	};
	addEventListener('error', printError);
}(self.addEventListener, self.document));
