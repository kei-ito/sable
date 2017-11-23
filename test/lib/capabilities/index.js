const env = require('../env');
const capabilities = [];
if (env.BROWSERSTACK) {
	capabilities.push(
		{
			os: 'OS X',
			os_version: 'Sierra',
			browserName: 'Chrome',
		},
		{
			os: 'OS X',
			os_version: 'Sierra',
			browserName: 'Firefox',
		},
		{
			os: 'OS X',
			os_version: 'Sierra',
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
		},
		{
			browserName: 'iPhone',
			platform: 'MAC',
			device: 'iPhone 6S',
		}
	);
} else {
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
