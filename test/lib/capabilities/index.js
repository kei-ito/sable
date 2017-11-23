const env = require('../env');
const capabilities = [];
if (env.BROWSERSTACK && env.TRAVIS_NODE_VERSION === '9') {
	capabilities.push(
		{
			os: 'OS X',
			os_version: 'High Sierra',
			browserName: 'Chrome',
		},
		{
			os: 'OS X',
			os_version: 'High Sierra',
			browserName: 'Firefox',
		},
		{
			os: 'OS X',
			os_version: 'High Sierra',
			browserName: 'Safari',
		},
		{
			os: 'Windows',
			os_version: '10',
			browserName: 'IE',
		},
		{
			os: 'Windows',
			os_version: '10',
			browserName: 'Edge',
		},
		{
			os: 'Windows',
			os_version: '10',
			browserName: 'Chrome',
		},
		{
			os: 'Windows',
			os_version: '10',
			browserName: 'Firefox',
		}
	);
} else if (!env.CI) {
	capabilities.push(
		{
			browserName: 'chrome',
			chromeOptions: {
				args: [
					'--headless',
				],
			},
		}
	);
}

module.exports = capabilities;
