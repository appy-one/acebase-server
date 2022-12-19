import { PathInfo, Transport, ValueMutation } from 'acebase-core';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendBadRequestError, sendError, sendUnauthorizedError } from '../shared/error';

export type RequestQuery = {
    path?: string;
    for?: Array<{ path: string, events: string[] }>;
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

    env.app.get(`/sync/mutations/${env.db.name}`, async (req: Request, res) => {
        // Gets mutations for specific path(s) and event combinations since given cursor
        if (!env.config.transactions?.log) {
            return sendBadRequestError(res, { code: 'no_transaction_logging', message: 'Transaction logging not enabled' });
        }
        try {
            const data = req.query;
            let targets = typeof data.path === 'string'
                ? [{ path: data.path, events: ['value'] }]
                : typeof data.for === 'string'
                    ? JSON.parse(data.for)
                    : null;
            if (targets === null) {
                return sendBadRequestError(res, { code: 'invalid_request', message: 'Invalid mutations request' });
            }
            if (targets.length === 0) {
                targets.push({ path: '', events: ['value'] });
            }
            // Filter out any requested paths user does not have access to.
            targets = targets.filter(target => {
                let path = target.path;
                if (target.events.every(event => /^(?:notify_)?child_/.test(event))) { //if (!target.events.some(event => ['value','notify_value','mutations','mutated'].includes(event))) {
                    // Only child_ events, check if they have access to children instead
                    path = PathInfo.get(path).childPath('*');
                }
                return env.rules.userHasAccess(req.user, path, false).allow;
            });
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
