import { QueryOptions, Transport } from 'acebase-core';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendError, sendUnauthorizedError } from '../shared/error';

export type RequestQuery = null;
export type RequestBody = {
    map: any;
    val: {
        query: {
            /** result filters */
            filters: Array<{ key: string, op: string, compare: any }>;
            /** number of results to skip, useful for paging */
            skip: number;
            /** max number of results to return */
            take: number;
            /** sort order */
            order: Array<{ key: string, ascending: boolean }>;
        };
        /** client's query id for realtime event notifications through the websocket */
        query_id?: string;
        /** client's socket id for realtime event notifications through websocket */
        client_id?: string;
        options: {
            snapshots?: boolean;
            monitor?: boolean|{ add: boolean; change: boolean; remove: boolean };
            include?: string[];
            exclude?: string[];
            child_objects?: boolean;
        };
    };
};
export type ResponseBody = {
    val: {
        count: number;
        list: any[]
    },
    map?: any
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.app.post(`/query/${env.db.name}/*`, async (req: Request, res) => {
        // Execute query
        const path = req.path.slice(env.db.name.length + 8);
        const access = await env.rules.isOperationAllowed(req.user, path, 'query');
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }

        const data = Transport.deserialize(req.body);
        if (typeof data !== 'object' || typeof data.query !== 'object' || typeof data.options !== 'object') {
            return sendError(res, { code: 'invalid_request', message: 'Invalid query request' });
        }
        const query = data.query;
        const options = data.options as QueryOptions;
        let cancelSubscription: () => Promise<void>;
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
                    if (!client) { return cancelSubscription?.(); } // Not connected, stop subscription
                    if (!(await env.rules.isOperationAllowed(client.user, event.path, 'get', { value: event.value })).allow) {
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
        catch(err) {
            sendError(res, { code: 'unknown', message: err.message });
        }
    });

};

export default addRoute;
