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
exports.addRoute = exports.UpdateDataError = void 0;
const acebase_1 = require("acebase");
const acebase_core_1 = require("acebase-core");
const rules_1 = require("../rules");
const error_1 = require("../shared/error");
class UpdateDataError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.UpdateDataError = UpdateDataError;
const addRoute = (env) => {
    env.router.post(`/data/${env.db.name}/*`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        const path = req.path.slice(env.db.name.length + 7);
        const LOG_ACTION = 'data.update';
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null, path };
        try {
            // Pre-check 'write' access
            let access = yield env.rules.isOperationAllowed(req.user, path, 'update');
            if (!access.allow) {
                throw new rules_1.AccessRuleValidationError(access);
            }
            const data = req.body;
            if (typeof (data === null || data === void 0 ? void 0 : data.val) === 'undefined' || !['string', 'object', 'undefined'].includes(typeof (data === null || data === void 0 ? void 0 : data.map))) {
                throw new UpdateDataError('invalid_serialized_value', 'The sent value is not properly serialized');
            }
            const val = acebase_core_1.Transport.deserialize(data);
            if (path === '' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.uid) !== 'admin' && val !== null && typeof val === 'object') {
                // Non-admin user: remove any private properties from the update object
                Object.keys(val).filter(key => key.startsWith('__')).forEach(key => delete val[key]);
            }
            // Check 'update' access
            access = yield env.rules.isOperationAllowed(req.user, path, 'update', { value: val, context: req.context });
            if (!access.allow) {
                throw new rules_1.AccessRuleValidationError(access);
            }
            // Schema validation moved to storage, no need to check here but an early check won't do no harm!
            const validation = yield env.db.schema.check(path, val, true);
            if (!validation.ok) {
                throw new acebase_1.SchemaValidationError(validation.reason);
            }
            yield env.db.ref(path)
                .context(req.context)
                .update(val);
            // NEW: add cursor to response context, which was added to the request context in `acebase_cursor` if transaction logging is enabled
            const returnContext = { acebase_cursor: req.context.acebase_cursor };
            res.setHeader('AceBase-Context', JSON.stringify(returnContext));
            res.send({ success: true });
        }
        catch (err) {
            if (err instanceof rules_1.AccessRuleValidationError) {
                const access = err.result;
                env.log.error(LOG_ACTION, 'unauthorized', Object.assign(Object.assign({}, LOG_DETAILS), { rule_code: access.code, rule_path: (_d = access.rulePath) !== null && _d !== void 0 ? _d : null, rule_error: (_f = (_e = access.details) === null || _e === void 0 ? void 0 : _e.message) !== null && _f !== void 0 ? _f : null }));
                return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
            }
            if (err instanceof acebase_1.SchemaValidationError) {
                env.log.error(LOG_ACTION, 'schema_validation_failed', Object.assign(Object.assign({}, LOG_DETAILS), { reason: err.reason }));
                res.status(422).send({ code: 'schema_validation_failed', message: err.message });
            }
            else if (err instanceof UpdateDataError) {
                env.log.error(LOG_ACTION, err.code, Object.assign(Object.assign({}, LOG_DETAILS), { message: err.message }));
                (0, error_1.sendBadRequestError)(res, err);
            }
            else {
                env.debug.error(`failed to update "${path}":`, err);
                env.log.error(LOG_ACTION, 'unexpected', LOG_DETAILS, err);
                (0, error_1.sendError)(res, err);
            }
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-update.js.map