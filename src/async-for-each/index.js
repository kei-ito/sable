module.exports = function asyncForEach(list, asyncFn, index = 0) {
	return index < list.length
	? asyncFn(list[index], index, list, () => asyncForEach(list, asyncFn, index + 1))
	: Promise.resolve();
};
