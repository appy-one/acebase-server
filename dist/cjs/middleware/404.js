"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMiddleware = void 0;
/**
 * Adds 404 middleware. Add this as very last handler!
 * @param env
 */
const addMiddleware = (env) => {
    env.app.use((req, res, next) => {
        res.status(404).send('Not Found');
    });
};
exports.addMiddleware = addMiddleware;
exports.default = exports.addMiddleware;
//# sourceMappingURL=404.js.map