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
exports.AceBaseServer = exports.AceBaseServerNotReadyError = void 0;
const acebase_core_1 = require("acebase-core");
const settings_1 = require("./settings");
const http_1 = require("./shared/http");
const websocket_1 = require("./websocket");
const acebase_1 = require("acebase");
const http_2 = require("http");
const https_1 = require("https");
const rules_1 = require("./rules");
const connection_1 = require("./middleware/connection");
const cors_1 = require("./middleware/cors");
const auth_1 = require("./routes/auth");
const auth_2 = require("./auth");
const data_1 = require("./routes/data");
const docs_1 = require("./routes/docs");
const webmanager_1 = require("./routes/webmanager");
const meta_1 = require("./routes/meta");
const swagger_1 = require("./middleware/swagger");
// type PrivateLocalSettings = AceBaseLocalSettings & { storage: PrivateStorageSettings };
class AceBaseServerNotReadyError extends Error {
    constructor() { super('Server is not ready yet'); }
}
exports.AceBaseServerNotReadyError = AceBaseServerNotReadyError;
class AceBaseServer extends acebase_core_1.SimpleEventEmitter {
    constructor(dbname, options) {
        super();
        this._ready = false;
        this.authProviders = {};
        this.config = new settings_1.AceBaseServerConfig(options);
        this.debug = new acebase_core_1.DebugLogger(this.config.logLevel, `[${dbname}]`.colorize(acebase_core_1.ColorStyle.green));
        if (this.config.auth.enabled && !this.config.https.enabled) {
            this.debug.warn(`WARNING: Authentication is enabled, but the server is not using https. Any password and other data transmitted may be intercepted!`.colorize(acebase_core_1.ColorStyle.red));
        }
        else if (!this.config.https.enabled) {
            this.debug.warn(`WARNING: Server is not using https, any data transmitted may be intercepted!`.colorize(acebase_core_1.ColorStyle.red));
        }
        if (!this.config.auth.enabled) {
            this.debug.warn(`WARNING: Authentication is disabled, *anyone* can do *anything* with your data!`.colorize(acebase_core_1.ColorStyle.red));
        }
        // Open database(s)
        const dbOptions = {
            logLevel: this.config.logLevel,
            info: 'realtime database server',
            // NEW: Allow storage setting like AceBaseLocalSettings - could allow using other db backend (typed, but undocumented)
            storage: this.config.storage || {
                path: this.config.path,
                removeVoidProperties: true,
            },
            transactions: this.config.transactions,
            ipc: this.config.ipc
        };
        this.db = new acebase_1.AceBase(dbname, dbOptions);
        const otherDbsPath = `${this.config.path}/${this.db.name}.acebase`;
        const authDb = (() => {
            if (!this.config.auth.enabled) {
                return null;
            }
            switch (this.config.auth.separateDb) {
                case true: return new acebase_1.AceBase('auth', { logLevel: dbOptions.logLevel, storage: { path: otherDbsPath, removeVoidProperties: true, info: `${dbname} auth database` } });
                case 'v2': /*NOT TESTED YET*/ return new acebase_1.AceBase(dbname, { logLevel: dbOptions.logLevel, storage: { type: 'auth', path: this.config.path, removeVoidProperties: true, info: `${dbname} auth database` } });
                default: return this.db;
            }
        })();
        this.init({ authDb });
    }
    get isReady() { return this._ready; }
    /**
     * Wait for the server to be ready to accept incoming connections
     * @param callback (optional) callback function that is called when ready. You can also use the returned promise
     * @returns returns a promise that resolves when ready
     */
    ready(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._ready) {
                yield this.once('ready');
            }
            callback === null || callback === void 0 ? void 0 : callback();
        });
    }
    /**
     * Gets the url the server is running at
     */
    get url() {
        return `http${this.config.https.enabled ? 's' : ''}://${this.config.host}:${this.config.port}`;
    }
    init(env) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const config = this.config;
            const db = this.db;
            const authDb = env.authDb;
            // Wait for databases to be ready to use
            yield Promise.all([
                db.ready(),
                authDb === null || authDb === void 0 ? void 0 : authDb.ready()
            ]);
            // Create http server and app
            const app = (0, http_1.createApp)({ trustProxy: true, maxPayloadSize: this.config.maxPayloadSize });
            const server = config.https.enabled ? (0, https_1.createServer)(config.https, app) : (0, http_2.createServer)(app);
            const clients = new Map();
            const securityRef = authDb ? authDb === db ? db.ref('__auth__/security') : authDb.ref('security') : null;
            const authRef = authDb ? authDb === db ? db.ref('__auth__/accounts') : authDb.ref('accounts') : null;
            const logRef = authDb ? authDb === db ? db.ref('__log__') : authDb.ref('log') : null;
            // Setup rules
            const rulesFilePath = `${this.config.path}/${this.db.name}.acebase/rules.json`;
            const rules = new rules_1.PathBasedRules(rulesFilePath, config.auth.defaultAccessRule, { db, debug: this.debug, authEnabled: this.config.auth.enabled });
            const routeEnv = {
                config: this.config,
                server,
                db: db,
                authDb,
                app,
                debug: this.debug,
                securityRef,
                authRef,
                logRef,
                tokenSalt: null,
                clients,
                authCache: null,
                authProviders: this.authProviders,
                rules
            };
            // Add connection middleware
            const killConnections = (0, connection_1.default)(routeEnv);
            // Add CORS middleware
            (0, cors_1.default)(routeEnv);
            if (config.auth.enabled) {
                // Setup auth database
                yield (0, auth_2.default)(routeEnv);
                // Add auth endpoints
                const { resetPassword, verifyEmailAddress } = (0, auth_1.default)(routeEnv);
                this.resetPassword = resetPassword;
                this.verifyEmailAddress = verifyEmailAddress;
            }
            // Add metadata endpoints
            (0, meta_1.default)(routeEnv);
            // If environment is development, add API docs
            if (((_b = (_a = process.env.NODE_ENV) === null || _a === void 0 ? void 0 : _a.trim) === null || _b === void 0 ? void 0 : _b.call(_a)) === 'development') {
                this.debug.warn('DEVELOPMENT MODE: adding API docs endpoint at /docs');
                (0, docs_1.default)(routeEnv);
                (0, swagger_1.default)(routeEnv);
            }
            // Add data endpoints
            (0, data_1.default)(routeEnv);
            // Add webmanager endpoints
            (0, webmanager_1.default)(routeEnv);
            // Allow adding custom routes
            this.extend = (method, ext_path, handler) => {
                const route = `/ext/${db.name}/${ext_path}`;
                this.debug.log(`Extending server: `, method, route);
                routeEnv.app[method.toLowerCase()](route, handler);
            };
            // Create websocket server
            (0, websocket_1.addWebsocketServer)(routeEnv);
            // Last but not least, add 404 handler
            // DISABLED because it causes server extension routes through server.extend (see above) not be be executed
            // add404Middleware(routeEnv);
            // Start listening
            server.listen(config.port, config.host, () => {
                // Ready!!
                this.debug.log(`"${db.name}" database server running at ${this.url}`);
                this._ready = true;
                this.emitOnce(`ready`);
            });
            // Setup pause and resume methods
            let paused = false;
            this.pause = () => __awaiter(this, void 0, void 0, function* () {
                if (paused) {
                    throw new Error('Server is already paused');
                }
                server.close();
                this.debug.warn(`Paused "${db.name}" database server at ${this.url}`);
                this.emit('pause');
                paused = true;
            });
            this.resume = () => __awaiter(this, void 0, void 0, function* () {
                if (!paused) {
                    throw new Error('Server is not paused');
                }
                return new Promise(resolve => {
                    server.listen(config.port, config.host, () => {
                        this.debug.warn(`Resumed "${db.name}" database server at ${this.url}`);
                        this.emit('resume');
                        paused = false;
                        resolve();
                    });
                });
            });
            // Handle SIGINT and shutdown requests
            const shutdown = (request) => __awaiter(this, void 0, void 0, function* () {
                this.debug.warn('shutting down server');
                routeEnv.rules.stop();
                const getConnectionsCount = () => {
                    return new Promise((resolve, reject) => {
                        server.getConnections((err, connections) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve(connections);
                            }
                        });
                    });
                };
                const connections = yield getConnectionsCount();
                this.debug.log(`Server has ${connections} connections`);
                yield new Promise((resolve) => {
                    // const interval = setInterval(async () => {
                    //     const connections = await getConnectionsCount();
                    //     this.debug.log(`Server still has ${connections} connections`);
                    // }, 5000);
                    // interval.unref();
                    server.close(err => {
                        if (err) {
                            console.error(`server.close() error: ${err.message}`);
                        }
                        else {
                            console.log(`server.close() success`);
                        }
                        resolve();
                    });
                    // If for some reason connection aren't broken in time - do proceed with shutdown sequence
                    const timeout = setTimeout(() => {
                        console.warn(`server.close() timed out, there are still open connections`);
                        killConnections();
                        // resolve();
                    }, 5000);
                    timeout.unref();
                    console.log(`Closing ${clients.size} websocket connections`);
                    clients.forEach((client, id) => {
                        const socket = client.socket;
                        socket.once('disconnect', reason => {
                            console.log(`Socket ${socket.id} disconnected: ${reason}`);
                        });
                        socket.disconnect(true);
                    });
                    // clients.list.slice().forEach(client => {
                    //     client.socket.disconnect(true);
                    // });
                });
                this.debug.warn('closing database');
                yield db.close();
                this.debug.warn('shutdown complete');
                // Emit events to let the outside world know we shut down. 
                // This is especially important if this instance was running in a Node.js cluster: the process will
                // not exit automatically after this shutdown because Node.js' IPC channel between worker and master is still open.
                // By sending these events, the cluster manager can determine if it should (and when to) execute process.exit()
                // process.emit('acebase-server-shutdown');             // Emit on process
                process.emit('beforeExit', request.sigint ? 130 : 0); // Emit on process
                try {
                    process.send && process.send('acebase-server-shutdown'); // Send to master process when running in a Node.js cluster
                }
                catch (err) {
                    // IPC Channel has apparently been closed already
                }
                this.emit('shutdown'); // Emit on AceBaseServer instance
            });
            this.shutdown = () => __awaiter(this, void 0, void 0, function* () { return yield shutdown({ sigint: false }); });
            process.on('SIGINT', () => shutdown({ sigint: true }));
        });
    }
    /**
     * Reset a user's password. This can also be done using the auth/reset_password API endpoint
     * @param clientIp ip address of the user
     * @param code reset code that was sent to the user's email address
     * @param newPassword new password chosen by the user
     */
    resetPassword(clientIp, code, newPassword) {
        throw new AceBaseServerNotReadyError();
    }
    /**
     * Marks a user account's email address as validated. This can also be done using the auth/verify_email API endpoint
     * @param clientIp ip address of the user
     * @param code verification code sent to the user's email address
     */
    verifyEmailAddress(clientIp, code) {
        throw new AceBaseServerNotReadyError();
    }
    /**
     * Shuts down the server. Stops listening for incoming connections, breaks current connections and closes the database.
     * Is automatically executed when a "SIGINT" process event is received.
     *
     * Once the shutdown procedure is completed, it emits a "shutdown" event on the server instance, "acebase-server-shutdown" event on the `process`, and sends an 'acebase-server-shutdown' IPC message if Node.js clustering is used.
     * These events can be handled by cluster managing code to `kill` or `exit` the process safely.
     */
    shutdown() {
        throw new AceBaseServerNotReadyError();
    }
    /**
     * Temporarily stops the server from handling incoming connections, but keeps existing connections open
     */
    pause() {
        throw new AceBaseServerNotReadyError();
    }
    /**
     * Resumes handling incoming connections
     */
    resume() {
        throw new AceBaseServerNotReadyError();
    }
    /**
     * Extend the server API with your own custom functions. Your handler will be listening
     * on path /ext/[db name]/[ext_path].
     * @example
     * // Server side:
     * const _quotes = [...];
     * server.extend('get', 'quotes/random', (req, res) => {
     *      let index = Math.round(Math.random() * _quotes.length);
     *      res.send(quotes[index]);
     * })
     * // Client side:
     * client.callExtension('get', 'quotes/random')
     * .then(quote => {
     *      console.log(`Got random quote: ${quote}`);
     * })
     * @param {'get'|'put'|'post'|'delete'} method
     * @param {string} ext_path
     * @param {(req: Express.Request, res: Express.Response)} handler
     */
    extend(method, ext_path, handler) {
        throw new AceBaseServerNotReadyError();
    }
    /**
     * Configure an auth provider to allow users to sign in with Facebook, Google, etc
     * @param providerName name of the third party OAuth provider. Eg: "Facebook", "Google", "spotify" etc
     * @param settings API key & secret for the OAuth provider
     * @returns Returns the created auth provider instance, which can be used to call non-user specific methods the provider might support. (example: the Spotify auth provider supports getClientAuthToken, which allows API calls to be made to the core (non-user) spotify service)
     */
    configAuthProvider(providerName, settings) {
        if (!this.config.auth.enabled) {
            throw new Error(`Authentication is not enabled`);
        }
        try {
            const { AuthProvider } = require('./oauth-providers/' + providerName);
            const provider = new AuthProvider(settings);
            this.authProviders[providerName] = provider;
            return provider;
        }
        catch (err) {
            throw new Error(`Failed to configure provider ${providerName}: ${err.message}`);
        }
    }
}
exports.AceBaseServer = AceBaseServer;
//# sourceMappingURL=server.js.map