import { SchemaValidationError } from 'acebase';
import { Transport } from 'acebase-core';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendError, sendUnauthorizedError } from '../shared/error';

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = {
    success: boolean;
} | { code: 'schema_validation_failed', message: string };

export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.app.post(`/data/${env.db.name}/*`, async (req: Request, res) => {
        // update data
        const path = req.path.slice(env.db.name.length + 7);
        const access = env.rules.userHasAccess(req.user, path, true);
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }

        try {
            const data = req.body;
            const val = Transport.deserialize(data);

            if (path === '' && req.user?.uid !== 'admin' && typeof val === 'object') {
                // Non-admin user: remove any private properties from the update object
                Object.keys(val).filter(key => key.startsWith('__')).forEach(key => delete val[key]);
            }

            // Schema validation moved to storage, no need to check here but an early check won't do no harm!
            let validation = await env.db.schema.check(path, val, true);
            if (!validation.ok) {
                throw new SchemaValidationError(validation.reason);
            }

            await env.db.ref(path)
                .context(req.context)
                .update(val);

            res.send({ success: true });
        }
        catch(err) {
            if (err instanceof SchemaValidationError) {
                env.logRef?.push({ action: 'update_data', success: false, code: 'schema_validation_failed', path, error: err.reason });
                res.status(422).send({ code: 'schema_validation_failed', message: err.message });
            }
            else {
                env.debug.error(`failed to update "${path}":`, err);
                env.logRef?.push({ action: 'update_data', success: false, code: `unknown_error`, path, error: err.message });
                sendError(res, err);
            }
        }
    });

};

export default addRoute;