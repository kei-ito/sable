const NS_PER_SEC = 1e9;
const NS_PER_MS = 1e6;

exports.getMsFromHrTime = function getMsFromHrTime(anchorTime) {
	const [sec, ns] = process.hrtime(anchorTime);
	return (((sec * NS_PER_SEC) + ns) / NS_PER_MS).toFixed(3);
};
