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
exports.addRoutes = exports.DataTransactionError = exports.TRANSACTION_TIMEOUT_MS = void 0;
const acebase_1 = require("acebase");
const acebase_core_1 = require("acebase-core");
const rules_1 = require("../rules");
const error_1 = require("../shared/error");
exports.TRANSACTION_TIMEOUT_MS = 10000; // 10s to finish a started transaction
class DataTransactionError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.DataTransactionError = DataTransactionError;
const addRoutes = (env) => {
    const _transactions = new Map();
    // Start transaction endpoint:
    env.router.post(`/transaction/${env.db.name}/start`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const data = req.body;
        const LOG_ACTION = 'data.transaction.start';
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null, path: data.path };
        // Pre-check read/write access
        const access = yield env.rules.isOperationAllowed(req.user, data.path, 'transact');
        if (!access.allow) {
            env.log.error(LOG_ACTION, 'unauthorized', Object.assign(Object.assign({}, LOG_DETAILS), { rule_code: access.code, rule_path: (_c = access.rulePath) !== null && _c !== void 0 ? _c : null }), access.details);
            return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
        }
        // Start transaction
        const tx = {
            id: acebase_core_1.ID.generate(),
            started: Date.now(),
            path: data.path,
            context: req.context,
            finish: undefined,
            timeout: setTimeout(() => {
                _transactions.delete(tx.id);
                tx.finish(); // Finish without value cancels the transaction
            }, exports.TRANSACTION_TIMEOUT_MS),
        };
        _transactions.set(tx.id, tx);
        try {
            env.debug.verbose(`Transaction ${tx.id} starting...`);
            // const ref = db.ref(tx.path);
            const donePromise = env.db.api.transaction(tx.path, (val) => __awaiter(void 0, void 0, void 0, function* () {
                var _e;
                env.debug.verbose(`Transaction ${tx.id} started with value: `, val);
                const access = yield env.rules.isOperationAllowed(req.user, data.path, 'get', { value: val, context: req.context });
                if (!access.allow) {
                    env.log.error(LOG_ACTION, 'unauthorized', Object.assign(Object.assign({}, LOG_DETAILS), { rule_code: access.code, rule_path: (_e = access.rulePath) !== null && _e !== void 0 ? _e : null }), access.details);
                    (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
                    return; // Return undefined to cancel transaction
                }
                const currentValue = acebase_core_1.Transport.serialize(val);
                const promise = new Promise((resolve) => {
                    tx.finish = (val) => {
                        env.debug.verbose(`Transaction ${tx.id} finishing with value: `, val);
                        _transactions.delete(tx.id);
                        resolve(val);
                        return donePromise;
                    };
                });
                res.send({ id: tx.id, value: currentValue });
                return promise;
            }), { context: tx.context });
        }
        catch (err) {
            yield (tx === null || tx === void 0 ? void 0 : tx.finish()); // Finish without value to cancel the transaction
            env.debug.error(`failed to start transaction on "${tx.path}":`, err);
            env.log.error(LOG_ACTION, (_d = err.code) !== null && _d !== void 0 ? _d : 'unexpected', LOG_DETAILS, typeof err.code === 'undefined' ? err : null);
            (0, error_1.sendUnexpectedError)(res, err);
        }
    }));
    // Finish transaction endpoint:
    env.router.post(`/transaction/${env.db.name}/finish`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _f, _g, _h, _j, _k, _l, _m;
        const data = req.body;
        const LOG_ACTION = 'data.transaction.finish';
        const LOG_DETAILS = { ip: req.ip, uid: (_g = (_f = req.user) === null || _f === void 0 ? void 0 : _f.uid) !== null && _g !== void 0 ? _g : null, path: data.path };
        const tx = _transactions.get(data.id);
        if (!tx || tx.path !== data.path) {
            env.log.error(LOG_ACTION, tx ? 'wrong_path' : 'not_found', Object.assign(Object.assign({}, LOG_DETAILS), { id: data.id, tx_path: (_h = tx === null || tx === void 0 ? void 0 : tx.path) !== null && _h !== void 0 ? _h : null }));
            res.statusCode = 410; // Gone
            res.send(`transaction not found`);
            return;
        }
        clearTimeout(tx.timeout);
        _transactions.delete(tx.id);
        // Finish transaction
        try {
            // Check again if a 'write' to this path is allowed by this user
            let access = yield env.rules.isOperationAllowed(req.user, tx.path, 'set');
            if (!access.allow) {
                throw new rules_1.AccessRuleValidationError(access);
            }
            let cancel = false;
            if (typeof data.value === 'object' && (data.value === null || Object.keys(data.value).length === 0)) {
                // Returning undefined from a transaction callback should cancel the transaction
                // acebase-client (Transport.serialize) serializes value undefined as { val: undefined, map: undefined }, which
                // then is sent to the server as an empty object: {}
                cancel = true;
            }
            else if (typeof ((_j = data.value) === null || _j === void 0 ? void 0 : _j.val) === 'undefined' || !['string', 'object', 'undefined'].includes(typeof ((_k = data.value) === null || _k === void 0 ? void 0 : _k.map))) {
                throw new DataTransactionError('invalid_serialized_value', 'The sent value is not properly serialized');
            }
            const newValue = cancel ? undefined : acebase_core_1.Transport.deserialize(data.value);
            if (tx.path === '' && ((_l = req.user) === null || _l === void 0 ? void 0 : _l.uid) !== 'admin' && newValue !== null && typeof newValue === 'object') {
                // Non-admin user: remove any private properties from the update object
                Object.keys(newValue).filter(key => key.startsWith('__')).forEach(key => delete newValue[key]);
            }
            // Check if the value to be written is allowed
            access = yield env.rules.isOperationAllowed(req.user, tx.path, 'set', { value: newValue, context: tx.context });
            if (!access.allow) {
                throw new rules_1.AccessRuleValidationError(access);
            }
            const result = yield tx.finish(newValue);
            // NEW: capture cursor and return it in the response context header
            if (!tx.context) {
                tx.context = {};
            }
            tx.context.acebase_cursor = result.cursor;
            res.setHeader('AceBase-Context', JSON.stringify(tx.context));
            res.send('done');
        }
        catch (err) {
            tx.finish(); // Finish without value cancels the transaction
            if (err instanceof rules_1.AccessRuleValidationError) {
                const access = err.result;
                env.log.error(LOG_ACTION, 'unauthorized', Object.assign(Object.assign({}, LOG_DETAILS), { rule_code: access.code, rule_path: (_m = access.rulePath) !== null && _m !== void 0 ? _m : null }), access.details);
                return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
            }
            else if (err instanceof acebase_1.SchemaValidationError) {
                env.log.error(LOG_ACTION, 'schema_validation_failed', Object.assign(Object.assign({}, LOG_DETAILS), { reason: err.reason }));
                res.status(422).send({ code: 'schema_validation_failed', message: err.message });
            }
            else if (err instanceof DataTransactionError) {
                env.log.error(LOG_ACTION, err.code, Object.assign(Object.assign({}, LOG_DETAILS), { message: err.message }));
                (0, error_1.sendBadRequestError)(res, err);
            }
            else {
                env.debug.error(`failed to finish transaction on "${tx.path}":`, err);
                env.log.error(LOG_ACTION, 'unexpected', LOG_DETAILS, err);
                (0, error_1.sendError)(res, err);
            }
        }
    }));
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=data-transaction.js.map