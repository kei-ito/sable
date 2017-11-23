function capabilityTitle(capability) {
	return ['device', 'os', 'os_version', 'browserName', 'browser_version', 'resolution']
	.reduce((values, key) => {
		const value = capability[key];
		if (value) {
			values.push(value);
		}
		return values;
	}, [])
	.join(',');
}

module.exports = capabilityTitle;
