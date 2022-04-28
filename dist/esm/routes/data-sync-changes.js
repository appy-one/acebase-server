import { PathInfo, Transport } from 'acebase-core';
import { sendBadRequestError, sendError, sendUnauthorizedError } from '../shared/error.js';
export const addRoute = (env) => {
    env.app.get(`/sync/changes/${env.db.name}`, async (req, res) => {
        // Gets effective changes for specific path(s) and event combinations since given cursor
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
                return sendBadRequestError(res, { code: 'invalid_request', message: 'Invalid changes request' });
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
            const cursor = data.cursor;
            const timestamp = parseInt(data.timestamp);
            console.error('DATA', timestamp);
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