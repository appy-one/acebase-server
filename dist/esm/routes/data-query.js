import { Transport } from 'acebase-core';
import { sendError, sendUnauthorizedError } from '../shared/error.js';
export const addRoute = (env) => {
    env.router.post(`/query/${env.db.name}/*`, async (req, res) => {
        // Execute query
        const path = req.path.slice(env.db.name.length + 8);
        const access = await env.rules.isOperationAllowed(req.user, path, 'query', { context: req.context });
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }
        const data = Transport.deserialize(req.body);
        if (typeof data !== 'object' || typeof data.query !== 'object' || typeof data.options !== 'object') {
            return sendError(res, { code: 'invalid_request', message: 'Invalid query request' });
        }
        const query = data.query;
        const options = data.options;
        let cancelSubscription;
        if (options.monitor === true) {
            options.monitor = { add: true, change: true, remove: true };
        }
        if (typeof options.monitor === 'object' && (options.monitor.add || options.monitor.change || options.monitor.remove)) {
            const queryId = data.query_id;
            const clientId = data.client_id;
            const client = env.clients.get(clientId);
            client.realtimeQueries[queryId] = { path, query, options };
            const sendEvent = async (event) => {
                try {
                    const client = env.clients.get(clientId);
                    if (!client) {
                        return cancelSubscription?.();
                    } // Not connected, stop subscription
                    if (!(await env.rules.isOperationAllowed(client.user, event.path, 'get', { context: req.context, value: event.value })).allow) {
                        return cancelSubscription?.(); // Access denied, stop subscription
                    }
                    event.query_id = queryId;
                    const data = Transport.serialize(event);
                    client.socket.emit('query-event', data);
                }
                catch (err) {
                    env.debug.error(`Unexpected error orccured trying to send event`);
                    env.debug.error(err);
                }
            };
            options.eventHandler = (event) => {
                sendEvent(event);
            };
        }
        try {
            const { results, context, stop } = await env.db.api.query(path, query, options);
            cancelSubscription = stop;
            if (!env.config.transactions?.log) {
                delete context.acebase_cursor;
            }
            const response = {
                count: results.length,
                list: results, // []
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