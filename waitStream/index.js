function waitStream(stream) {
	return new Promise((resolve, reject) => {
		stream
		.once('error', reject)
		.once('finish', resolve);
	});
}

module.exports = waitStream;
