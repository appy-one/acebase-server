import { PathInfo, Transport } from 'acebase-core';
import { sendBadRequestError, sendError, sendUnauthorizedError } from '../shared/error.js';
export const addRoute = (env) => {
    env.router.get(`/sync/changes/${env.db.name}`, async (req, res) => {
        // Gets effective changes for specific path(s) and event combinations since given cursor
        if (!env.config.transactions?.log) {
            return sendBadRequestError(res, { code: 'no_transaction_logging', message: 'Transaction logging not enabled' });
        }
        try {
            const data = req.query;
            const targets = typeof data.path === 'string'
                ? [{ path: data.path, events: ['value'] }]
                : typeof data.for === 'string'
                    ? JSON.parse(data.for)
                    : null;
            if (targets === null) {
                return sendBadRequestError(res, { code: 'invalid_request', message: 'Invalid changes request' });
            }
            if (targets.length === 0) {
                targets.push({ path: '', events: ['value'] });
            }
            // Filter out any requested paths user does not have access to.
            const accessCache = new Map();
            for (let i = 0; i < targets.length; i++) {
                const target = targets[i];
                let path = target.path;
                if (target.events.every(event => /^(?:notify_)?child_/.test(event))) { //if (!target.events.some(event => ['value','notify_value','mutations','mutated'].includes(event))) {
                    // Only child_ events, check if they have access to children instead
                    path = PathInfo.get(path).childPath('*');
                }
                let allow = false;
                if (accessCache.has(path)) {
                    allow = accessCache.get(path);
                }
                else {
                    const access = await env.rules.isOperationAllowed(req.user, path, 'get');
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
            let timestamp;
            if (typeof data.timestamp !== 'undefined') {
                timestamp = parseInt(data.timestamp);
                if (isNaN(timestamp)) {
                    return sendBadRequestError(res, { code: 'wrong_timestamp', message: 'Timestamp is not a number' });
                }
            }
            const result = await env.db.api.getChanges({ for: targets, cursor, timestamp });
            res.setHeader('AceBase-Context', JSON.stringify({ acebase_cursor: result.new_cursor }));
            res.contentType('application/json');
            const serialized = Transport.serialize2(result.changes);
            res.send(serialized);
        }
        catch (err) {
            sendError(res, err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=data-sync-changes.js.map