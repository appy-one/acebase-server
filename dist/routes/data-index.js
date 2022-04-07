"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const error_1 = require("../shared/error");
const addRoute = (env) => {
    env.app.post(`/index/${env.db.name}`, async (req, res) => {
        // create / remove / rebuild index
        if (!req.user || req.user.username !== 'admin') {
            return error_1.sendUnauthorizedError(res, 'admin_only', 'only admin can perform index operations');
        }
        try {
            const data = req.body;
            if (data.action === 'create') {
                await env.db.indexes.create(data.path, data.key, data.options);
            }
            // else if (data.action === 'rebuild') {
            //     // TODO
            // }
            // else if (data.action === 'remove') {
            //     // TODO
            // }
            else {
                throw new Error('Invalid action');
            }
            res.contentType('application/json').send({ success: true });
        }
        catch (err) {
            env.debug.error(`failed to perform index action`, err);
            error_1.sendError(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-index.js.map