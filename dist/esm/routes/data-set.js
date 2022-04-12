import { SchemaValidationError } from 'acebase';
import { Transport } from 'acebase-core';
import { sendError, sendUnauthorizedError } from '../shared/error.js';
export const addRoute = (env) => {
    env.app.put(`/data/${env.db.name}/*`, async (req, res) => {
        // Set data
        const path = req.path.slice(env.db.name.length + 7);
        const access = env.rules.userHasAccess(req.user, path, true);
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }
        try {
            const data = req.body;
            const val = Transport.deserialize(data);
            if (path === '' && req.user?.uid !== 'admin' && val !== null && typeof val === 'object') {
                // Non-admin user: remove any private properties from the update object
                Object.keys(val).filter(key => key.startsWith('__')).forEach(key => delete val[key]);
            }
            // Schema validation moved to storage, no need to check here but an early check won't do no harm!
            const validation = await env.db.schema.check(path, val, false);
            if (!validation.ok) {
                throw new SchemaValidationError(validation.reason);
            }
            await env.db.ref(path)
                .context(req.context)
                .set(val);
            res.send({ success: true });
        }
        catch (err) {
            if (err instanceof SchemaValidationError) {
                env.logRef?.push({ action: 'set_data', success: false, code: 'schema_validation_failed', path, error: err.reason, ip: req.ip, uid: req.user?.uid ?? null });
                res.status(422).send({ code: 'schema_validation_failed', message: err.message });
            }
            else {
                env.debug.error(`failed to set "${path}":`, err);
                env.logRef?.push({ action: 'set_data', success: false, code: 'unknown_error', path, error: err.message, ip: req.ip, uid: req.user?.uid ?? null });
                sendError(res, err);
            }
        }
        ;
    });
};
export default addRoute;
//# sourceMappingURL=data-set.js.map