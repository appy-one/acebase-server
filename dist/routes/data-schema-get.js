"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const error_1 = require("../shared/error");
const addRoute = (env) => {
    env.app.get(`/schema/${env.db.name}/*`, async (req, res) => {
        // Get defined schema for a specifc path
        if (!req.user || req.user.username !== 'admin') {
            return error_1.sendUnauthorizedError(res, 'admin_only', 'only admin can perform schema operations');
        }
        try {
            const path = req.path.slice(env.db.name.length + 9);
            const schema = await env.db.schema.get(path);
            res.contentType('application/json').send(schema);
        }
        catch (err) {
            error_1.sendError(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-schema-get.js.map