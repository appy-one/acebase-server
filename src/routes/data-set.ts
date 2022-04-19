import { SchemaValidationError } from 'acebase';
import { Transport } from 'acebase-core';
import { SerializedValue } from 'acebase-core/types/transport';
import { RuleValidationFailCode } from '../rules';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendBadRequestError, sendError, sendUnauthorizedError } from '../shared/error';

export class SetDataError extends Error { 
    constructor(public code: 'invalid_serialized_value', message: string) {
        super(message);
    }
}
export type RequestQuery = null;
export type RequestBody = SerializedValue; // { val: any; map?: string|Record<string, 'date'|'binary'|'reference'|'regexp'|'array'> };
export type ResponseBody = { success: true }                    // 200
    | { code: 'invalid_serialized_value', message: string }     // 400
    | { code: RuleValidationFailCode, message: string }         // 403
    | { code: 'schema_validation_failed', message: string }     // 422
    | { code: string, message: string }                         // 500

export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.app.put(`/data/${env.db.name}/*`, async (req: Request, res) => {
        // Set data
        const path = req.path.slice(env.db.name.length + 7);
        const access = env.rules.userHasAccess(req.user, path, true);
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }

        try {
            const data = req.body;
            if (typeof data?.val === 'undefined' || !['string','object','undefined'].includes(typeof data?.map)) {
                throw new SetDataError('invalid_serialized_value', 'The sent value is not properly serialized');
            }
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
        catch(err) {
            if (err instanceof SchemaValidationError) {
                env.logRef?.push({ action: 'set_data', success: false, code: 'schema_validation_failed', path, error: err.reason, ip: req.ip, uid: req.user?.uid ?? null });
                res.status(422).send({ code: 'schema_validation_failed', message: err.message });
            }
            else if (err instanceof SetDataError) {
                env.logRef?.push({ action: 'set_data', success: false, code: err.code, path, ip: req.ip, uid: req.user?.uid ?? null });
                sendBadRequestError(res, err);
            }
            else {
                env.debug.error(`failed to set "${path}":`, err);
                env.logRef?.push({ action: 'set_data', success: false, code: 'unknown_error', path, error: err.message, ip: req.ip, uid: req.user?.uid ?? null });
                sendError(res, err);
            }
        };
    });

};

export default addRoute;