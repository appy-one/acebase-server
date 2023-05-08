"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMiddleware = void 0;
/**
 * Adds 404 middleware. This binds to `env.app` so routes added to `env.router` always come first, even if they are added after the 404 handler
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