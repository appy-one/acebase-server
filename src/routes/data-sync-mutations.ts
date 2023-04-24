import { PathInfo, Transport, ValueMutation } from 'acebase-core';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendBadRequestError, sendError, sendUnauthorizedError } from '../shared/error';

export type RequestQuery = {
    path?: string;
    for?: string;
    cursor?: string;
    timestamp?: string;
};
export type RequestBody = null;
export type ResponseBody = ValueMutation[] // 200
    | { code: 'no_transaction_logging', message: string }   // 400
    | { code: 'invalid_request', message: string }          // 400
    | { code: 'not_authorized', message: string }           // 403
    | { code: 'unexpected', message: string };              // 500

export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.router.get(`/sync/mutations/${env.db.name}`, async (req: Request, res) => {
        // Gets mutations for specific path(s) and event combinations since given cursor
        if (!env.config.transactions?.log) {
            return sendBadRequestError(res, { code: 'no_transaction_logging', message: 'Transaction logging not enabled' });
        }
        try {
            const data = req.query;
            const targets = typeof data.path === 'string'
                ? [{ path: data.path, events: ['value'] }]
                : typeof data.for === 'string'
                    ? JSON.parse(data.for) as Array<{ path: string, events: string[] }>
                    : null;
            if (targets === null) {
                return sendBadRequestError(res, { code: 'invalid_request', message: 'Invalid mutations request' });
            }
            if (targets.length === 0) {
                targets.push({ path: '', events: ['value'] });
            }
            // Filter out any requested paths user does not have access to.
            const accessCache = new Map<string, boolean>();
            for (let i = 0; i < targets.length; i++) {
                const target = targets[i];
                let path = target.path;
                if (target.events.every(event => /^(?:notify_)?child_/.test(event))) {
                    // Only child_ events, check if they have access to children instead
                    path = PathInfo.get(path).childPath('*');
                }
                let allow = false;
                if (accessCache.has(path)) {
                    allow = accessCache.get(path);
                }
                else {
                    const access = await env.rules.isOperationAllowed(req.user, path, 'read');
                    allow = access.allow;
                    accessCache.set(path, allow);
                }
                if (!allow) {
                    targets.splice(i, 1);
                    i--;
                }
            }
            if (targets.length === 0) {
                return sendUnauthorizedError(res, 'not_authorized', 'User is not authorized to access this data');
            }

            const { cursor } = data;
            let timestamp: number;
            if (typeof data.timestamp !== 'undefined') {
                timestamp = parseInt(data.timestamp);
                if (isNaN(timestamp)) {
                    return sendBadRequestError(res, { code: 'wrong_timestamp', message: 'Timestamp is not a number' });
                }
            }
            const result = await env.db.api.getMutations({ for: targets, cursor, timestamp });

            res.setHeader('AceBase-Context', JSON.stringify({ acebase_cursor: result.new_cursor }));
            res.contentType('application/json');

            const serialized = Transport.serialize2(result.mutations);
            res.send(serialized as ValueMutation[]);
        }
        catch(err) {
            sendError(res, err);
        }
    });


};

export default addRoute;
