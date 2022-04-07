"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const error_1 = require("../shared/error");
const addRoute = (env) => {
    env.app.get(`/index/${env.db.name}`, async (req, res) => {
        // Get all indexes
        if (!req.user || req.user.username !== 'admin') {
            return error_1.sendUnauthorizedError(res, 'admin_only', 'only admin can perform index operations');
        }
        try {
            const indexes = await env.db.indexes.get();
            res.contentType('application/json').send(indexes);
        }
        catch (err) {
            error_1.sendError(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-indexes-list.js.map