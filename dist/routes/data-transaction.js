"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const acebase_core_1 = require("acebase-core");
const error_1 = require("../shared/error");
const addRoutes = (env) => {
    const _transactions = new Map();
    // Start transaction endpoint:
    env.app.post(`/transaction/${env.db.name}/start`, (req, res) => {
        const data = req.body;
        const access = env.rules.userHasAccess(req.user, data.path, true);
        if (!access.allow) {
            return error_1.sendUnauthorizedError(res, access.code, access.message);
        }
        // Start transaction
        const tx = {
            id: acebase_core_1.ID.generate(),
            started: Date.now(),
            path: data.path,
            context: req.context,
            finish: undefined
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
                        resolve(val);
                        return donePromise;
                    };
                });
                res.send({ id: tx.id, value: currentValue });
                return promise;
            }, { context: tx.context });
        }
        catch (err) {
            error_1.sendUnexpectedError(res, err);
        }
    });
    // Finish transaction endpoint:
    env.app.post(`/transaction/${env.db.name}/finish`, async (req, res) => {
        const data = req.body;
        const tx = _transactions.get(data.id);
        if (!tx) {
            res.statusCode = 410; // Gone
            res.send(`transaction not found`);
            return;
        }
        _transactions.delete(data.id);
        const access = env.rules.userHasAccess(req.user, data.path, true);
        if (!access.allow) {
            return error_1.sendUnauthorizedError(res, access.code, access.message);
        }
        // Finish transaction
        try {
            const newValue = acebase_core_1.Transport.deserialize(data.value);
            await tx.finish(newValue);
            res.send('done');
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err.message);
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=data-transaction.js.map