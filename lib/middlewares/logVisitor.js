const crypto = require('crypto');
const chalk = require('chalk');
const createTimeStamp = () => new Date().toISOString();
exports.logVisitor = ({
	silent = false,
} = {}) => {
	const visitors = new Map();
	const getVisitorId = (req) => {
		const hash = crypto.createHash('sha256');
		const {
			connection: {remoteAddress: address},
			headers: {'user-agent': userAgent},
		} = req;
		hash.update(`${address}${userAgent}`);
		return {
			id: hash.digest('base64'),
			address,
			userAgent,
		};
	};
	const middleware = (req, res, next, server) => {
		const {id: visitorId, userAgent, address} = getVisitorId(req);
		if (!visitors.has(visitorId)) {
			const index = visitors.size;
			visitors.set(visitorId, {
				index,
				id: visitorId,
				address,
				userAgent,
				createdAt: createTimeStamp(),
				count: 0,
			});
		}
		const visitor = visitors.get(visitorId);
		visitor.count++;
		visitor.updatedAt = createTimeStamp();
		if (!silent) {
			server.log(chalk.dim(`${visitor.id.slice(0, 5)} (${visitor.count}) ${req.method} ${req.url}`));
		}
		next();
	};
	middleware.onStart = (server) => {
		server.getVisitorId = getVisitorId;
		server.visitors = visitors;
	};
	middleware.onClose = (server) => {
		for (const [, visitor] of visitors) {
			server.log(JSON.stringify(visitor, null, 2));
		}
	};
	return middleware;
};
