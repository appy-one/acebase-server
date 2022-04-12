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
exports.addRoutes = exports.TRANSACTION_TIMEOUT_MS = void 0;
const acebase_1 = require("acebase");
const acebase_core_1 = require("acebase-core");
const error_1 = require("../shared/error");
exports.TRANSACTION_TIMEOUT_MS = 10000; // 10s to finish a started transaction
const addRoutes = (env) => {
    const _transactions = new Map();
    // Start transaction endpoint:
    env.app.post(`/transaction/${env.db.name}/start`, (req, res) => {
        var _a, _b, _c, _d;
        const data = req.body;
        const access = env.rules.userHasAccess(req.user, data.path, true);
        if (!access.allow) {
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
            }, exports.TRANSACTION_TIMEOUT_MS)
        };
        _transactions.set(tx.id, tx);
        try {
            env.debug.verbose(`Transaction ${tx.id} starting...`);
            // const ref = db.ref(tx.path);
            const donePromise = env.db.api.transaction(tx.path, val => {
                env.debug.verbose(`Transaction ${tx.id} started with value: `, val);
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
            }, { context: tx.context });
        }
        catch (err) {
            env.debug.error(`failed to start transaction on "${tx.path}":`, err);
            (_a = env.logRef) === null || _a === void 0 ? void 0 : _a.push({ action: 'tx_start', success: false, code: (_b = err.code) !== null && _b !== void 0 ? _b : 'unknown_error', path: tx.path, error: err.message, ip: req.ip, uid: (_d = (_c = req.user) === null || _c === void 0 ? void 0 : _c.uid) !== null && _d !== void 0 ? _d : null });
            (0, error_1.sendUnexpectedError)(res, err);
        }
    });
    // Finish transaction endpoint:
    env.app.post(`/transaction/${env.db.name}/finish`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        const data = req.body;
        const tx = _transactions.get(data.id);
        if (!tx || tx.path !== data.path) {
            res.statusCode = 410; // Gone
            res.send(`transaction not found`);
            return;
        }
        clearTimeout(tx.timeout);
        _transactions.delete(tx.id);
        const access = env.rules.userHasAccess(req.user, tx.path, true);
        if (!access.allow) {
            return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
        }
        // Finish transaction
        try {
            const newValue = acebase_core_1.Transport.deserialize(data.value);
            if (tx.path === '' && ((_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== 'admin' && newValue !== null && typeof newValue === 'object') {
                // Non-admin user: remove any private properties from the update object
                Object.keys(newValue).filter(key => key.startsWith('__')).forEach(key => delete newValue[key]);
            }
            yield tx.finish(newValue);
            res.send('done');
        }
        catch (err) {
            tx.finish(); // Finish without value cancels the transaction
            if (err instanceof acebase_1.SchemaValidationError) {
                (_b = env.logRef) === null || _b === void 0 ? void 0 : _b.push({ action: 'tx_finish', success: false, code: 'schema_validation_failed', path: tx.path, error: err.reason, ip: req.ip, uid: (_d = (_c = req.user) === null || _c === void 0 ? void 0 : _c.uid) !== null && _d !== void 0 ? _d : null });
                res.status(422).send({ code: 'schema_validation_failed', message: err.message });
            }
            else {
                env.debug.error(`failed to finsih transaction on "${tx.path}":`, err);
                (_e = env.logRef) === null || _e === void 0 ? void 0 : _e.push({ action: 'tx_finish', success: false, code: 'unknown_error', path: tx.path, error: err.message, ip: req.ip, uid: (_g = (_f = req.user) === null || _f === void 0 ? void 0 : _f.uid) !== null && _g !== void 0 ? _g : null });
                (0, error_1.sendError)(res, err);
            }
        }
    }));
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=data-transaction.js.map