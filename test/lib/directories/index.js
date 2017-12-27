const path = require('path');
const test = path.join(__dirname, '..', '..');
const src = path.join(test, 'src');
const temp = path.join('test', 'temp', `${Date.now()}`);
module.exports = {
	test,
	src,
	temp,
};
