import { SchemaValidationError } from 'acebase';
import { ID, Transport } from 'acebase-core';
import { sendBadRequestError, sendError, sendUnauthorizedError, sendUnexpectedError } from '../shared/error.js';
export const TRANSACTION_TIMEOUT_MS = 10000; // 10s to finish a started transaction
export class DataTransactionError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
export const addRoutes = (env) => {
    const _transactions = new Map();
    // Start transaction endpoint:
    env.app.post(`/transaction/${env.db.name}/start`, (req, res) => {
        const data = req.body;
        const LOG_ACTION = 'data.transaction.start';
        const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null, path: data.path };
        const access = env.rules.userHasAccess(req.user, data.path, true);
        if (!access.allow) {
            env.log.error(LOG_ACTION, 'unauthorized', { ...LOG_DETAILS, rule_code: access.code, rule_path: access.rulePath ?? null }, access.details);
            return sendUnauthorizedError(res, access.code, access.message);
        }
        // Start transaction
        const tx = {
            id: ID.generate(),
            started: Date.now(),
            path: data.path,
            context: req.context,
            finish: undefined,
            timeout: setTimeout(() => {
                _transactions.delete(tx.id);
                tx.finish(); // Finish without value cancels the transaction
            }, TRANSACTION_TIMEOUT_MS),
        };
        _transactions.set(tx.id, tx);
        try {
            env.debug.verbose(`Transaction ${tx.id} starting...`);
            // const ref = db.ref(tx.path);
            const donePromise = env.db.api.transaction(tx.path, val => {
                env.debug.verbose(`Transaction ${tx.id} started with value: `, val);
                const currentValue = Transport.serialize(val);
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
            env.log.error(LOG_ACTION, err.code ?? 'unexpected', LOG_DETAILS, typeof err.code === 'undefined' ? err : null);
            sendUnexpectedError(res, err);
        }
    });
    // Finish transaction endpoint:
    env.app.post(`/transaction/${env.db.name}/finish`, async (req, res) => {
        const data = req.body;
        const LOG_ACTION = 'data.transaction.finish';
        const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null, path: data.path };
        const tx = _transactions.get(data.id);
        if (!tx || tx.path !== data.path) {
            env.log.error(LOG_ACTION, tx ? 'wrong_path' : 'not_found', { ...LOG_DETAILS, id: data.id, tx_path: tx?.path ?? null });
            res.statusCode = 410; // Gone
            res.send(`transaction not found`);
            return;
        }
        clearTimeout(tx.timeout);
        _transactions.delete(tx.id);
        const access = env.rules.userHasAccess(req.user, tx.path, true);
        if (!access.allow) {
            env.log.error(LOG_ACTION, 'unauthorized', { ...LOG_DETAILS, rule_code: access.code, rule_path: access.rulePath ?? null }, access.details);
            return sendUnauthorizedError(res, access.code, access.message);
        }
        // Finish transaction
        try {
            let cancel = false;
            if (typeof data.value === 'object' && (data.value === null || Object.keys(data.value).length === 0)) {
                // Returning undefined from a transaction callback should cancel the transaction
                // acebase-client (Transport.serialize) serializes value undefined as { val: undefined, map: undefined }, which
                // then is sent to the server as an empty object: {}
                cancel = true;
            }
            else if (typeof data.value?.val === 'undefined' || !['string', 'object', 'undefined'].includes(typeof data.value?.map)) {
                throw new DataTransactionError('invalid_serialized_value', 'The sent value is not properly serialized');
            }
            const newValue = cancel ? undefined : Transport.deserialize(data.value);
            if (tx.path === '' && req.user?.uid !== 'admin' && newValue !== null && typeof newValue === 'object') {
                // Non-admin user: remove any private properties from the update object
                Object.keys(newValue).filter(key => key.startsWith('__')).forEach(key => delete newValue[key]);
            }
            const result = await tx.finish(newValue);
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
            if (err instanceof SchemaValidationError) {
                env.log.error(LOG_ACTION, 'schema_validation_failed', { ...LOG_DETAILS, reason: err.reason });
                res.status(422).send({ code: 'schema_validation_failed', message: err.message });
            }
            else if (err instanceof DataTransactionError) {
                env.log.error(LOG_ACTION, err.code, { ...LOG_DETAILS, message: err.message });
                sendBadRequestError(res, err);
            }
            else {
                env.debug.error(`failed to finish transaction on "${tx.path}":`, err);
                env.log.error(LOG_ACTION, 'unexpected', LOG_DETAILS, err);
                sendError(res, err);
            }
        }
    });
};
export default addRoutes;
//# sourceMappingURL=data-transaction.js.map