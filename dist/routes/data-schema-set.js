"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const error_1 = require("../shared/error");
const addRoute = (env) => {
    env.app.post(`/schema/${env.db.name}`, async (req, res) => {
        // defines a schema
        if (!req.user || req.user.username !== 'admin') {
            return error_1.sendUnauthorizedError(res, 'admin_only', 'only admin can perform schema operations');
        }
        try {
            const data = req.body;
            if (data.action === 'set') {
                const { path, schema } = data;
                await env.db.schema.set(path, schema);
            }
            else {
                throw new Error(`Invalid action`);
            }
            res.contentType('application/json').send({ success: true });
        }
        catch (err) {
            error_1.sendError(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-schema-set.js.map