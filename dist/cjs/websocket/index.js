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
exports.addWebsocketServer = exports.SocketRequestError = void 0;
const acebase_core_1 = require("acebase-core");
const clients_1 = require("../shared/clients");
const tokens_1 = require("../shared/tokens");
const socket_io_1 = require("./socket.io");
class SocketRequestError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.SocketRequestError = SocketRequestError;
const addWebsocketServer = (env) => {
    // TODO: Allow using uWebSockets.js server instead of Socket.IO
    const serverManager = (0, socket_io_1.createServer)(env);
    const getClientBySocketId = (id, event) => {
        const client = env.clients.get(id);
        if (!client) {
            env.debug.error(`Cannot find client "${id}" for socket event "${event}"`);
        }
        return client;
    };
    serverManager.on('connect', event => {
        const client = new clients_1.ConnectedClient(event.socket);
        env.clients.set(client.id, client);
        env.debug.warn(`New socket connected, total: ${env.clients.size}`);
        serverManager.send(event.socket, 'welcome');
    });
    serverManager.on('disconnect', event => {
        // We lost one
        const client = getClientBySocketId(event.socket_id, 'disconnect');
        if (!client) {
            return;
        } // Disconnected a client we did not know? Don't crash, just ignore.
        const subscribedPaths = Object.keys(client.subscriptions);
        if (subscribedPaths.length > 0) {
            // TODO: Substitute the original callbacks to cache them
            // if the client then reconnects within a certain time,
            // we can send the missed notifications
            //
            // subscribedPaths.forEach(path => {
            //     client.subscriptions[path].forEach(subscr => {
            //         subscr.callback
            //     })
            // });
            const remove = [];
            subscribedPaths.forEach(path => {
                remove.push(...client.subscriptions[path]);
            });
            remove.forEach(subscr => {
                // Unsubscribe them at db level and remove from our list
                env.db.api.unsubscribe(subscr.path, subscr.event, subscr.callback); //db.ref(subscr.path).off(subscr.event, subscr.callback);
                const pathSubs = client.subscriptions[subscr.path];
                pathSubs.splice(pathSubs.indexOf(subscr), 1);
            });
        }
        env.clients.delete(client.id);
        env.debug.verbose(`Socket disconnected, total: ${env.clients.size}`);
    });
    serverManager.on('signin', event => {
        // client sends this request once user has been signed in, binds the user to the socket,
        // deprecated since client v0.9.4, which sends client_id with signin api call
        // const client = clients.get(socket.id);
        const client = getClientBySocketId(event.socket_id, 'signin');
        if (!client) {
            return;
        }
        try {
            const uid = (0, tokens_1.decodePublicAccessToken)(event.data.accessToken, env.tokenSalt).uid;
            client.user = env.authCache.get(uid) || null;
        }
        catch (err) {
            // no way to bind the user
            env.debug.error(`websocket: invalid access token passed to signin: ${event.data.accessToken}`);
        }
    });
    serverManager.on('signout', event => {
        // deprecated since client v0.9.4, which sends client_id with signout api call
        // const client = clients.get(socket.id);
        const client = getClientBySocketId(event.socket_id, 'signout');
        if (!client) {
            return;
        }
        client.user = null;
    });
    serverManager.on('oauth2-signin', (event) => __awaiter(void 0, void 0, void 0, function* () {
        // acebase-client does not use socket oauth flow yet
        const client = getClientBySocketId(event.socket_id, 'oauth2-signin');
        if (!client) {
            return;
        }
        const request = event.data;
        const providerName = typeof request === 'string' ? request : request.provider;
        try {
            const provider = env.authProviders[providerName];
            const state = Buffer.from(JSON.stringify({ flow: 'socket', provider: providerName, client_id: client.id })).toString('base64');
            const clientAuthUrl = yield provider.init({ redirect_url: `${request.server.protocol}://${request.server.host}:${request.server.port}/ouath2/${env.db.name}/signin`, state, options: request.options });
            serverManager.send(event.socket, 'oauth2-signin', { action: 'auth', url: clientAuthUrl });
        }
        catch (err) {
            env.debug.error(`websocket: cannot sign in with oauth provider ${providerName}`);
            serverManager.send(event.socket, 'oauth2-signin', { error: err.message });
        }
    }));
    const acknowledgeRequest = (socket, requestId) => {
        // Send acknowledgement
        serverManager.send(socket, 'result', {
            success: true,
            req_id: requestId,
        });
    };
    const failRequest = (socket, requestId, code) => {
        // Send error
        serverManager.send(socket, 'result', {
            success: false,
            reason: code,
            req_id: requestId,
        });
    };
    serverManager.on('subscribe', (event) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        // Client wants to subscribe to events on a node
        const client = getClientBySocketId(event.socket_id, 'subscribe');
        if (!client) {
            return;
        }
        const eventName = event.data.event;
        const subscriptionPath = event.data.path;
        env.debug.verbose(`Client ${event.socket_id} subscribes to event "${eventName}" on path "/${subscriptionPath}"`.colorize([acebase_core_1.ColorStyle.bgWhite, acebase_core_1.ColorStyle.black]));
        const isSubscribed = () => subscriptionPath in client.subscriptions && client.subscriptions[subscriptionPath].some(s => s.event === eventName);
        if (isSubscribed()) {
            return acknowledgeRequest(event.socket, event.data.req_id);
        }
        // Get client
        // const client = clients.get(socket.id);
        if (!(yield env.rules.isOperationAllowed(client.user, subscriptionPath, 'get'))) {
            env.log.error('event.subscribe', 'access_denied', { uid: (_b = (_a = client.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : 'anonymous', path: subscriptionPath });
            return failRequest(event.socket, event.data.req_id, 'access_denied');
        }
        const callback = (err, path, currentValue, previousValue, context) => __awaiter(void 0, void 0, void 0, function* () {
            if (!isSubscribed()) {
                // Not subscribed anymore. Cancel sending
                return;
            }
            if (err) {
                return;
            }
            if (!(yield env.rules.isOperationAllowed(client.user, path, 'get', { value: currentValue, context }))) { // 'event', { eventName, subscriptionPath, currentValue, previousValue, context })
                if (!subscriptionPath.includes('*') && !subscriptionPath.includes('$')) {
                    // Could potentially be very many callbacks, so
                    // DISABLED: logRef.push({ action: `access_revoked`, uid: client.user ? client.user.uid : '-', path: subscriptionPath });
                    // Only log when user subscribes again
                    failRequest(event.socket, event.data.req_id, 'access_denied');
                }
                return;
            }
            const val = acebase_core_1.Transport.serialize({
                current: currentValue,
                previous: previousValue,
            });
            env.debug.verbose(`Sending data event "${eventName}" for path "/${path}" to client ${event.socket_id}`.colorize([acebase_core_1.ColorStyle.bgWhite, acebase_core_1.ColorStyle.black]));
            // TODO: let large data events notify the client, then let them download the data manually so it doesn't have to be transmitted through the websocket
            serverManager.send(event.socket, 'data-event', {
                subscr_path: subscriptionPath,
                path,
                event: eventName,
                val,
                context,
            });
        });
        let pathSubs = client.subscriptions[subscriptionPath];
        if (!pathSubs) {
            pathSubs = client.subscriptions[subscriptionPath] = [];
        }
        const subscr = { path: subscriptionPath, event: eventName, callback };
        pathSubs.push(subscr);
        env.db.api.subscribe(subscriptionPath, eventName, callback);
        acknowledgeRequest(event.socket, event.data.req_id);
    }));
    serverManager.on('unsubscribe', event => {
        // Client unsubscribes from events on a node
        const client = getClientBySocketId(event.socket_id, 'unsubscribe');
        if (!client) {
            return;
        }
        const eventName = event.data.event;
        const subscriptionPath = event.data.path;
        env.debug.verbose(`Client ${event.socket_id} is unsubscribing from event "${eventName || '(any)'}" on path "/${subscriptionPath}"`.colorize([acebase_core_1.ColorStyle.bgWhite, acebase_core_1.ColorStyle.black]));
        // const client = clients.get(socket.id);
        const pathSubs = client.subscriptions[subscriptionPath];
        if (!pathSubs) {
            // We have no knowledge of any active subscriptions on this path
            return acknowledgeRequest(event.socket, event.data.req_id);
        }
        let remove = pathSubs;
        if (eventName) {
            // Unsubscribe from a specific event
            remove = pathSubs.filter(subscr => subscr.event === eventName);
        }
        remove.forEach(subscr => {
            // Unsubscribe them at db level and remove from our list
            //this.debug.verbose(`   - unsubscribing from event ${subscr.event} with${subscr.callback ? "" : "out"} callback on path "${data.path}"`);
            env.db.api.unsubscribe(subscr.path, subscr.event, subscr.callback); //db.api.unsubscribe(data.path, subscr.event, subscr.callback);
            pathSubs.splice(pathSubs.indexOf(subscr), 1);
        });
        if (pathSubs.length === 0) {
            // No subscriptions left on this path, remove the path entry
            delete client.subscriptions[subscriptionPath];
        }
        return acknowledgeRequest(event.socket, event.data.req_id);
    });
    serverManager.on('query-unsubscribe', event => {
        // Client unsubscribing from realtime query events
        const client = getClientBySocketId(event.socket_id, 'query-unsubscribe');
        if (!client) {
            return;
        }
        env.debug.verbose(`Client ${event.socket_id} is unsubscribing from realtime query "${event.data.query_id}"`);
        // const client = clients.get(socket.id);
        delete client.realtimeQueries[event.data.query_id];
        acknowledgeRequest(event.socket, event.data.req_id);
    });
    const TRANSACTION_TIMEOUT_MS = 10000; // 10s to finish a started transaction
    serverManager.on('transaction-start', (event) => __awaiter(void 0, void 0, void 0, function* () {
        var _c, _d, _e;
        // Start transaction
        const client = getClientBySocketId(event.socket_id, 'transaction-start');
        if (!client || !event.data) {
            return;
        }
        const LOG_ACTION = 'socket.transaction.start';
        const LOG_DETAILS = { ip: event.socket.conn.remoteAddress, uid: (_d = (_c = client.user) === null || _c === void 0 ? void 0 : _c.uid) !== null && _d !== void 0 ? _d : null, path: event.data.path };
        env.debug.verbose(`Client ${event.socket_id} is sending transaction start request on path "${event.data.path}"`);
        const data = event.data;
        // Pre-check if reading AND writing is allowed (special transact operation)
        const access = yield env.rules.isOperationAllowed(client.user, data.path, 'transact');
        if (!access.allow) {
            env.log.error(LOG_ACTION, 'unauthorized', Object.assign(Object.assign({}, LOG_DETAILS), { rule_code: access.code, rule_path: (_e = access.rulePath) !== null && _e !== void 0 ? _e : null }), access.details);
            return serverManager.send(event.socket, 'tx_error', { id: data.id, reason: 'access_denied' });
        }
        const tx = {
            id: data.id,
            started: Date.now(),
            path: data.path,
            context: data.context,
            finish: undefined,
            timeout: setTimeout(() => {
                delete client.transactions[tx.id];
                tx.finish(); // Finish without value cancels the transaction
                env.log.error(LOG_ACTION, 'timeout', LOG_DETAILS);
                serverManager.send(event.socket, 'tx_error', { id: tx.id, reason: 'timeout' });
            }, TRANSACTION_TIMEOUT_MS),
        };
        // Bind to client
        client.transactions[data.id] = tx;
        // Start transaction
        env.debug.verbose(`Transaction ${tx.id} starting...`);
        const donePromise = env.db.api.transaction(tx.path, (val) => __awaiter(void 0, void 0, void 0, function* () {
            var _f;
            env.debug.verbose(`Transaction ${tx.id} started with value: `, val);
            const access = yield env.rules.isOperationAllowed(client.user, data.path, 'get', { value: val, context: tx.context });
            if (!access.allow) {
                env.log.error(LOG_ACTION, 'unauthorized', Object.assign(Object.assign({}, LOG_DETAILS), { rule_code: access.code, rule_path: (_f = access.rulePath) !== null && _f !== void 0 ? _f : null }), access.details);
                serverManager.send(event.socket, 'tx_error', { id: tx.id, reason: 'access_denied' });
                return; // Return undefined to cancel transaction
            }
            const currentValue = acebase_core_1.Transport.serialize(val);
            const promise = new Promise((resolve) => {
                tx.finish = (val) => {
                    env.debug.verbose(`Transaction ${tx.id} finishing with value: `, val);
                    resolve(val);
                    return donePromise;
                };
            });
            serverManager.send(event.socket, 'tx_started', { id: tx.id, value: currentValue });
            return promise;
        }), { context: tx.context });
    }));
    serverManager.on('transaction-finish', (event) => __awaiter(void 0, void 0, void 0, function* () {
        var _g, _h, _j, _k, _l;
        // Finish transaction
        const client = getClientBySocketId(event.socket_id, 'transaction-finish');
        if (!client || !event.data) {
            return;
        }
        const LOG_ACTION = 'socket.transaction.finish';
        const LOG_DETAILS = { ip: event.socket.conn.remoteAddress, uid: (_h = (_g = client.user) === null || _g === void 0 ? void 0 : _g.uid) !== null && _h !== void 0 ? _h : null, path: event.data.path };
        const data = event.data;
        const tx = client.transactions[data.id];
        try {
            if (!tx || data.path !== tx.path) {
                env.log.error(LOG_ACTION, tx ? 'wrong_path' : 'not_found', Object.assign(Object.assign({}, LOG_DETAILS), { id: data.id, tx_path: (_j = tx === null || tx === void 0 ? void 0 : tx.path) !== null && _j !== void 0 ? _j : null }));
                throw new SocketRequestError('transaction_not_found', 'Transaction not found');
            }
            clearTimeout(tx.timeout);
            delete client.transactions[data.id];
            const newValue = 'val' in data.value ? acebase_core_1.Transport.deserialize(data.value) : undefined;
            if (typeof newValue !== 'undefined') {
                const access = yield env.rules.isOperationAllowed(client.user, data.path, 'set', { value: newValue, context: tx.context });
                if (!access.allow) {
                    env.log.error(LOG_ACTION, 'unauthorized', Object.assign(Object.assign({}, LOG_DETAILS), { rule_code: access.code, rule_path: (_k = access.rulePath) !== null && _k !== void 0 ? _k : null }), access.details);
                    throw new SocketRequestError('access_denied', 'Access denied');
                }
            }
            const { cursor } = yield tx.finish(newValue);
            env.debug.verbose(`Transaction ${tx.id} finished`);
            serverManager.send(event.socket, 'tx_completed', { id: tx.id, context: { cursor } });
        }
        catch (err) {
            if (!(err instanceof SocketRequestError)) {
                // Other errors have been logged already
                env.log.error(LOG_ACTION, 'unexpected', LOG_DETAILS, err);
            }
            serverManager.send(event.socket, 'tx_error', { id: tx.id, reason: (_l = err.code) !== null && _l !== void 0 ? _l : err.message, data });
            tx.finish(); // Finish with undefined, canceling the transaction
        }
    }));
    return serverManager;
};
exports.addWebsocketServer = addWebsocketServer;
//# sourceMappingURL=index.js.map