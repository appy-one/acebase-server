import { Transport } from 'acebase-core';
import { sendError, sendUnauthorizedError } from '../shared/error.js';
export const addRoute = (env) => {
    env.app.post(`/query/${env.db.name}/*`, async (req, res) => {
        // Execute query
        const path = req.path.slice(env.db.name.length + 8);
        const access = env.rules.userHasAccess(req.user, path, false);
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }
        const data = Transport.deserialize(req.body);
        if (typeof data !== 'object' || typeof data.query !== 'object' || typeof data.options !== 'object') {
            return sendError(res, { code: 'invalid_request', message: 'Invalid query request' });
        }
        const query = data.query;
        const options = data.options;
        if (options.monitor === true) {
            options.monitor = { add: true, change: true, remove: true };
        }
        if (typeof options.monitor === 'object' && (options.monitor.add || options.monitor.change || options.monitor.remove)) {
            const queryId = data.query_id;
            const clientId = data.client_id;
            const client = env.clients.get(clientId);
            client.realtimeQueries[queryId] = { path, query, options };
            const sendEvent = event => {
                const client = env.clients.get(clientId);
                if (!client) {
                    return false;
                } // Not connected, stop subscription
                if (!env.rules.userHasAccess(client.user, event.path, false).allow) {
                    return false; // Access denied, stop subscription
                }
                event.query_id = queryId;
                const data = Transport.serialize(event);
                client.socket.emit('query-event', data);
            };
            options.eventHandler = sendEvent;
        }
        try {
            const { results, context } = await env.db.api.query(path, query, options);
            if (!env.config.transactions?.log) {
                delete context.acebase_cursor;
            }
            const response = {
                count: results.length,
                list: results // []
            };
            res.setHeader('AceBase-Context', JSON.stringify(context));
            res.send(Transport.serialize(response));
        }
        catch (err) {
            sendError(res, { code: 'unknown', message: err.message });
        }
    });
};
export default addRoute;
//# sourceMappingURL=data-query.js.map