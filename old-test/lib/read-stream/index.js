module.exports = function readStream(readable) {
	return new Promise((resolve, reject) => {
		const buffers = [];
		let length = 0;
		readable
		.once('error', reject)
		.on('data', (chunk) => {
			buffers.push(chunk);
			length += chunk.length;
		})
		.once('end', () => {
			resolve(Buffer.concat(buffers, length));
		});
	});
};
