const https = require('https');
const env = require('../env');

module.exports = function markResult({session, status, reason = ''}) {
	const sessionId = session.getId();
	return new Promise((resolve, reject) => {
		https.request({
			method: 'PUT',
			host: 'www.browserstack.com',
			path: `/automate/sessions/${sessionId}.json`,
			auth: `${env.BROWSERSTACK_USERNAME}:${env.BROWSERSTACK_ACCESS_KEY}`,
			headers: {'Content-Type': 'application/json'},
		})
		.once('error', reject)
		.once('response', resolve)
		.end(JSON.stringify({
			status,
			reason,
		}));
	});
};
