"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const acebase_1 = require("acebase");
const acebase_core_1 = require("acebase-core");
const error_1 = require("../shared/error");
const addRoute = (env) => {
    env.app.post(`/data/${env.db.name}/*`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        // update data
        const path = req.path.slice(env.db.name.length + 7);
        const access = env.rules.userHasAccess(req.user, path, true);
        if (!access.allow) {
            return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
        }
        try {
            const data = req.body;
            const val = acebase_core_1.Transport.deserialize(data);
            if (path === '' && ((_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== 'admin' && val !== null && typeof val === 'object') {
                // Non-admin user: remove any private properties from the update object
                Object.keys(val).filter(key => key.startsWith('__')).forEach(key => delete val[key]);
            }
            // Schema validation moved to storage, no need to check here but an early check won't do no harm!
            const validation = yield env.db.schema.check(path, val, true);
            if (!validation.ok) {
                throw new acebase_1.SchemaValidationError(validation.reason);
            }
            yield env.db.ref(path)
                .context(req.context)
                .update(val);
            res.send({ success: true });
        }
        catch (err) {
            if (err instanceof acebase_1.SchemaValidationError) {
                (_b = env.logRef) === null || _b === void 0 ? void 0 : _b.push({ action: 'update_data', success: false, code: 'schema_validation_failed', path, error: err.reason, ip: req.ip, uid: (_d = (_c = req.user) === null || _c === void 0 ? void 0 : _c.uid) !== null && _d !== void 0 ? _d : null });
                res.status(422).send({ code: 'schema_validation_failed', message: err.message });
            }
            else {
                env.debug.error(`failed to update "${path}":`, err);
                (_e = env.logRef) === null || _e === void 0 ? void 0 : _e.push({ action: 'update_data', success: false, code: `unknown_error`, path, error: err.message, ip: req.ip, uid: (_g = (_f = req.user) === null || _f === void 0 ? void 0 : _f.uid) !== null && _g !== void 0 ? _g : null });
                (0, error_1.sendError)(res, err);
            }
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-update.js.map