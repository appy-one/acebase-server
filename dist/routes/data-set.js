"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const acebase_1 = require("acebase");
const acebase_core_1 = require("acebase-core");
const error_1 = require("../shared/error");
const addRoute = (env) => {
    env.app.put(`/data/${env.db.name}/*`, async (req, res) => {
        var _a, _b, _c;
        // Set data
        const path = req.path.slice(env.db.name.length + 7);
        const access = env.rules.userHasAccess(req.user, path, true);
        if (!access.allow) {
            return error_1.sendUnauthorizedError(res, access.code, access.message);
        }
        try {
            const data = req.body;
            const val = acebase_core_1.Transport.deserialize(data);
            if (path === '' && ((_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== 'admin' && typeof val === 'object') {
                // Non-admin user: remove any private properties from the update object
                Object.keys(val).filter(key => key.startsWith('__')).forEach(key => delete val[key]);
            }
            // Schema validation moved to storage, no need to check here but an early check won't do no harm!
            const validation = await env.db.schema.check(path, val, false);
            if (!validation.ok) {
                throw new acebase_1.SchemaValidationError(validation.reason);
            }
            await env.db.ref(path)
                .context(req.context)
                .set(val);
            res.send({ success: true });
        }
        catch (err) {
            if (err instanceof acebase_1.SchemaValidationError) {
                (_b = env.logRef) === null || _b === void 0 ? void 0 : _b.push({ action: 'set_data', success: false, code: 'schema_validation_failed', path, error: err.reason });
                res.status(422).send({ code: 'schema_validation_failed', message: err.message });
            }
            else {
                env.debug.error(`failed to set "${path}":`, err);
                (_c = env.logRef) === null || _c === void 0 ? void 0 : _c.push({ action: 'set_data', success: false, code: 'unknown_error', path, error: err.message });
                error_1.sendError(res, err);
            }
        }
        ;
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-set.js.map