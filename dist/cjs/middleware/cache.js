"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMiddleware = void 0;
const addMiddleware = (env) => {
    env.app.use((req, res, next) => {
        // Disable cache for GET requests to make sure browsers do not use cached responses
        if (req.method === 'GET') {
            res.setHeader('Cache-Control', 'no-cache');
        }
        next();
    });
};
exports.addMiddleware = addMiddleware;
exports.default = exports.addMiddleware;
//# sourceMappingURL=cache.js.map