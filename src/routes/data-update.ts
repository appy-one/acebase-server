import { SchemaValidationError } from 'acebase';
import { Transport } from 'acebase-core';
import { RuleValidationFailCode } from '../rules';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendBadRequestError, sendError, sendUnauthorizedError } from '../shared/error';

export class UpdateDataError extends Error { 
    constructor(public code: 'invalid_serialized_value', message: string) {
        super(message);
    }
}

export type RequestQuery = null;
export type RequestBody = Transport.SerializedValue; //{ val: any; map?: string|Record<string, 'date'|'binary'|'reference'|'regexp'|'array'> };
export type ResponseBody = { success: true }                    // 200
    | { code: 'invalid_serialized_value', message: string }     // 400
    | { code: RuleValidationFailCode, message: string }         // 403
    | { code: 'schema_validation_failed', message: string }     // 422
    | { code: string, message: string }                         // 500

export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.app.post(`/data/${env.db.name}/*`, async (req: Request, res) => {

        const path = req.path.slice(env.db.name.length + 7);
        const LOG_ACTION = 'data.update';
        const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null, path };

        const access = env.rules.userHasAccess(req.user, path, true);
        if (!access.allow) {
            env.log.error(LOG_ACTION, 'unauthorized', { ...LOG_DETAILS, rule_code: access.code, rule_path: access.rulePath ?? null, rule_error: access.details?.message ?? null });
            return sendUnauthorizedError(res, access.code, access.message);
        }

        try {
            const data = req.body;
            if (typeof data?.val === 'undefined' || !['string','object','undefined'].includes(typeof data?.map)) {
                throw new UpdateDataError('invalid_serialized_value', 'The sent value is not properly serialized');
            }
            const val = Transport.deserialize(data);

            if (path === '' && req.user?.uid !== 'admin' && val !== null && typeof val === 'object') {
                // Non-admin user: remove any private properties from the update object
                Object.keys(val).filter(key => key.startsWith('__')).forEach(key => delete val[key]);
            }

            // Schema validation moved to storage, no need to check here but an early check won't do no harm!
            const validation = await env.db.schema.check(path, val, true);
            if (!validation.ok) {
                throw new SchemaValidationError(validation.reason);
            }

            await env.db.ref(path)
                .context(req.context)
                .update(val);

            // NEW: add cursor to response context, which was added to the request context in `acebase_cursor` if transaction logging is enabled
            const returnContext = { acebase_cursor: req.context.acebase_cursor };
            res.setHeader('AceBase-Context', JSON.stringify(returnContext) );

            res.send({ success: true });
        }
        catch(err) {
            if (err instanceof SchemaValidationError) {
                env.log.error(LOG_ACTION, 'schema_validation_failed', { ...LOG_DETAILS, reason: err.reason });
                res.status(422).send({ code: 'schema_validation_failed', message: err.message });
            }
            else if (err instanceof UpdateDataError) {
                env.log.error(LOG_ACTION, err.code, { ...LOG_DETAILS, message: err.message });
                sendBadRequestError(res, err);
            }
            else {
                env.debug.error(`failed to update "${path}":`, err);
                env.log.error(LOG_ACTION, 'unexpected', LOG_DETAILS, err);
                sendError(res, err);
            }
        }
    });

};

export default addRoute;