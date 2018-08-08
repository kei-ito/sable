const env = require('./env.js');
exports.capabilities = env.BROWSERSTACK
? [
	{os: 'OS X', os_version: 'High Sierra', browserName: 'Chrome'},
	{os: 'OS X', os_version: 'High Sierra', browserName: 'Firefox'},
	{os: 'OS X', os_version: 'High Sierra', browserName: 'Safari'},
	{os: 'Windows', os_version: '10', browserName: 'IE'},
	{os: 'Windows', os_version: '10', browserName: 'Edge'},
	{os: 'Windows', os_version: '10', browserName: 'Chrome'},
	{os: 'Windows', os_version: '10', browserName: 'Firefox'},
]
: [
	{
		browserName: 'chrome',
		chromeOptions: {
			args: [
				'--headless',
				'--no-sandbox',
				'--disable-dev-shm-usage',
			],
		},
	},
];