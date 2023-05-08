"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const acebase_core_1 = require("acebase-core");
const error_1 = require("../shared/error");
const addRoute = (env) => {
    env.router.post(`/query/${env.db.name}/*`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // Execute query
        const path = req.path.slice(env.db.name.length + 8);
        const access = yield env.rules.isOperationAllowed(req.user, path, 'query', { context: req.context });
        if (!access.allow) {
            return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
        }
        const data = acebase_core_1.Transport.deserialize(req.body);
        if (typeof data !== 'object' || typeof data.query !== 'object' || typeof data.options !== 'object') {
            return (0, error_1.sendError)(res, { code: 'invalid_request', message: 'Invalid query request' });
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
            const sendEvent = (event) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const client = env.clients.get(clientId);
                    if (!client) {
                        return cancelSubscription === null || cancelSubscription === void 0 ? void 0 : cancelSubscription();
                    } // Not connected, stop subscription
                    if (!(yield env.rules.isOperationAllowed(client.user, event.path, 'get', { context: req.context, value: event.value })).allow) {
                        return cancelSubscription === null || cancelSubscription === void 0 ? void 0 : cancelSubscription(); // Access denied, stop subscription
                    }
                    event.query_id = queryId;
                    const data = acebase_core_1.Transport.serialize(event);
                    client.socket.emit('query-event', data);
                }
                catch (err) {
                    env.debug.error(`Unexpected error orccured trying to send event`);
                    env.debug.error(err);
                }
            });
            options.eventHandler = (event) => {
                sendEvent(event);
            };
        }
        try {
            const { results, context, stop } = yield env.db.api.query(path, query, options);
            cancelSubscription = stop;
            if (!((_a = env.config.transactions) === null || _a === void 0 ? void 0 : _a.log)) {
                delete context.acebase_cursor;
            }
            const response = {
                count: results.length,
                list: results, // []
            };
            res.setHeader('AceBase-Context', JSON.stringify(context));
            res.send(acebase_core_1.Transport.serialize(response));
        }
        catch (err) {
            (0, error_1.sendError)(res, { code: 'unknown', message: err.message });
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-query.js.map