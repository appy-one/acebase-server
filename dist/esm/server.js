import { ColorStyle, DebugLogger, SimpleEventEmitter } from 'acebase-core';
import { AceBaseServerConfig } from './settings/index.js';
import { createApp, createRouter } from './shared/http.js';
import { addWebsocketServer } from './websocket/index.js';
import { AceBase } from 'acebase';
import { createServer } from 'http';
import { createServer as createSecureServer } from 'https';
import oAuth2Providers from './oauth-providers/index.js';
import { PathBasedRules } from './rules.js';
import addConnectionMiddleware from './middleware/connection.js';
import addCorsMiddleware from './middleware/cors.js';
import addAuthenticionRoutes from './routes/auth.js';
import setupAuthentication from './auth.js';
import addDataRoutes from './routes/data.js';
import addWebManagerRoutes from './routes/webmanager.js';
import addMetadataRoutes from './routes/meta.js';
import add404Middleware from './middleware/404.js';
import addCacheMiddleware from './middleware/cache.js';
import { DatabaseLog } from './logger.js';
// type PrivateLocalSettings = AceBaseLocalSettings & { storage: PrivateStorageSettings };
export class AceBaseServerNotReadyError extends Error {
    constructor() { super('Server is not ready yet'); }
}
export class AceBaseExternalServerError extends Error {
    constructor() { super('This method is not available with an external server'); }
}
export class AceBaseServer extends SimpleEventEmitter {
    get isReady() { return this._ready; }
    /**
     * Wait for the server to be ready to accept incoming connections
     * @param callback (optional) callback function that is called when ready. You can also use the returned promise
     * @returns returns a promise that resolves when ready
     */
    async ready(callback) {
        if (!this._ready) {
            await this.once('ready');
        }
        callback?.();
    }
    /**
     * Gets the url the server is running at
     */
    get url() {
        return `http${this.config.https.enabled ? 's' : ''}://${this.config.host}:${this.config.port}/${this.config.rootPath}`;
    }
    constructor(dbname, options) {
        super();
        this._ready = false;
        this.authProviders = {};
        this.config = new AceBaseServerConfig(options);
        this.debug = new DebugLogger(this.config.logLevel, `[${dbname}]`.colorize(ColorStyle.green));
        if (this.config.auth.enabled && !this.config.https.enabled) {
            this.debug.warn(`WARNING: Authentication is enabled, but the server is not using https. Any password and other data transmitted may be intercepted!`.colorize(ColorStyle.red));
        }
        else if (!this.config.https.enabled) {
            this.debug.warn(`WARNING: Server is not using https, any data transmitted may be intercepted!`.colorize(ColorStyle.red));
        }
        if (!this.config.auth.enabled) {
            this.debug.warn(`WARNING: Authentication is disabled, *anyone* can do *anything* with your data!`.colorize(ColorStyle.red));
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
            ipc: this.config.ipc,
            sponsor: this.config.sponsor,
            logColors: this.config.logColors,
        };
        this.db = new AceBase(dbname, dbOptions);
        const otherDbsPath = `${this.config.path}/${this.db.name}.acebase`;
        const authDb = (() => {
            if (!this.config.auth.enabled) {
                return null;
            }
            switch (this.config.auth.separateDb) {
                case true: return new AceBase('auth', { logLevel: dbOptions.logLevel, storage: { path: otherDbsPath, removeVoidProperties: true, info: `${dbname} auth database` } });
                case 'v2': /*NOT TESTED YET*/ return new AceBase(dbname, { logLevel: dbOptions.logLevel, storage: { type: 'auth', path: this.config.path, removeVoidProperties: true, info: `${dbname} auth database` } });
                default: return this.db;
            }
        })();
        // Create Express app
        this.app = createApp({ trustProxy: true, maxPayloadSize: this.config.maxPayloadSize });
        this.router = createRouter();
        this.app.use(`/${this.config.rootPath}`, this.router);
        // Initialize and start server
        this.init({ authDb });
    }
    async init(env) {
        const config = this.config;
        const db = this.db;
        const authDb = env.authDb;
        // Wait for databases to be ready to use
        await Promise.all([
            db.ready(),
            authDb?.ready(),
        ]);
        // Create http server
        this.config.server?.on('request', this.app);
        const server = this.config.server || (config.https.enabled ? createSecureServer(config.https, this.app) : createServer(this.app));
        const clients = new Map();
        const securityRef = authDb ? authDb === db ? db.ref('__auth__/security') : authDb.ref('security') : null;
        const authRef = authDb ? authDb === db ? db.ref('__auth__/accounts') : authDb.ref('accounts') : null;
        const logRef = authDb ? authDb === db ? db.ref('__log__') : authDb.ref('log') : null;
        const logger = new DatabaseLog(logRef);
        // Setup rules
        const rulesFilePath = `${this.config.path}/${this.db.name}.acebase/rules.json`;
        const rules = new PathBasedRules(rulesFilePath, config.auth.defaultAccessRule, { db, debug: this.debug, authEnabled: this.config.auth.enabled });
        this.setRule = (rulePath, ruleType, callback) => {
            return rules.add(rulePath, ruleType, callback);
        };
        const routeEnv = {
            config: this.config,
            server,
            db: db,
            authDb,
            app: this.app,
            router: this.router,
            rootPath: this.config.rootPath,
            debug: this.debug,
            securityRef,
            authRef,
            log: logger,
            tokenSalt: null,
            clients,
            authCache: null,
            authProviders: this.authProviders,
            rules,
            instance: this,
        };
        // Add connection middleware
        const killConnections = addConnectionMiddleware(routeEnv);
        // Add CORS middleware
        addCorsMiddleware(routeEnv);
        // Add cache middleware
        addCacheMiddleware(routeEnv);
        if (config.auth.enabled) {
            // Setup auth database
            await setupAuthentication(routeEnv);
            // Add auth endpoints
            const { resetPassword, verifyEmailAddress } = addAuthenticionRoutes(routeEnv);
            this.resetPassword = resetPassword;
            this.verifyEmailAddress = verifyEmailAddress;
        }
        // Add metadata endpoints
        addMetadataRoutes(routeEnv);
        // If environment is development, add API docs
        if (process.env.NODE_ENV && process.env.NODE_ENV.trim() === 'development') {
            this.debug.warn('DEVELOPMENT MODE: adding API docs endpoint at /docs');
            (await import('./routes/docs.js')).addRoute(routeEnv);
            (await import('./middleware/swagger.js')).addMiddleware(routeEnv);
        }
        // Add data endpoints
        addDataRoutes(routeEnv);
        // Add webmanager endpoints
        addWebManagerRoutes(routeEnv);
        // Allow adding custom routes
        this.extend = (method, ext_path, handler) => {
            const route = `/ext/${db.name}/${ext_path}`;
            this.debug.log(`Extending server: `, method, route);
            this.router[method.toLowerCase()](route, handler);
        };
        // Create websocket server
        addWebsocketServer(routeEnv);
        // Run init callback to allow user code to call `server.extend`, `server.router.[method]`, `server.setRule` etc before the server starts listening
        await this.config.init?.(this);
        // If we own the server, add 404 handler
        if (!this.config.server) {
            add404Middleware(routeEnv);
        }
        // Setup pause and resume methods
        let paused = false;
        this.pause = async () => {
            if (this.config.server) {
                throw new AceBaseExternalServerError();
            }
            if (paused) {
                throw new Error('Server is already paused');
            }
            server.close();
            this.debug.warn(`Paused "${db.name}" database server at ${this.url}`);
            this.emit('pause');
            paused = true;
        };
        this.resume = async () => {
            if (this.config.server) {
                throw new AceBaseExternalServerError();
            }
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
        };
        // Handle SIGINT and shutdown requests
        const shutdown = async (request) => {
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
            const connections = await getConnectionsCount();
            this.debug.log(`Server has ${connections} connections`);
            await new Promise((resolve) => {
                // const interval = setInterval(async () => {
                //     const connections = await getConnectionsCount();
                //     this.debug.log(`Server still has ${connections} connections`);
                // }, 5000);
                // interval.unref();
                server.close(err => {
                    if (err) {
                        this.debug.error(`server.close() error: ${err.message}`);
                    }
                    else {
                        this.debug.log(`server.close() success`);
                    }
                    resolve();
                });
                // If for some reason connection aren't broken in time - do proceed with shutdown sequence
                const timeout = setTimeout(() => {
                    if (clients.size === 0) {
                        return;
                    }
                    this.debug.warn(`server.close() timed out, there are still open connections`);
                    killConnections();
                }, 5000);
                timeout.unref();
                this.debug.log(`Closing ${clients.size} websocket connections`);
                clients.forEach((client, id) => {
                    const socket = client.socket;
                    socket.once('disconnect', reason => {
                        this.debug.log(`Socket ${socket.id} disconnected: ${reason}`);
                    });
                    socket.disconnect(true);
                });
            });
            this.debug.warn('closing database');
            await db.close();
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
        };
        this.shutdown = async () => {
            if (this.config.server) {
                throw new AceBaseExternalServerError();
            }
            await shutdown({ sigint: false });
        };
        if (this.config.server) {
            // Offload shutdown control to an external server
            server.on('close', function close() {
                server.off('request', this.app);
                server.off('close', close);
                shutdown({ sigint: false });
            });
            const ready = () => {
                this.debug.log(`"${db.name}" database server running at ${this.url}`);
                this._ready = true;
                this.emitOnce(`ready`);
                server.off('listening', ready);
            };
            if (server.listening) {
                ready();
            }
            else {
                server.on('listening', ready);
            }
        }
        else {
            // Start listening
            server.listen(config.port, config.host, () => {
                // Ready!!
                this.debug.log(`"${db.name}" database server running at ${this.url}`);
                this._ready = true;
                this.emitOnce(`ready`);
            });
            process.on('SIGINT', () => shutdown({ sigint: true }));
        }
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
     * @param method http method to bind to
     * @param ext_path path to bind to (appended to /ext/)
     * @param handler your Express request handler callback
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
            const AuthProvider = oAuth2Providers[providerName];
            const provider = new AuthProvider(settings);
            this.authProviders[providerName] = provider;
            return provider;
        }
        catch (err) {
            throw new Error(`Failed to configure provider ${providerName}: ${err.message}`);
        }
    }
    setRule(paths, types, callback) {
        throw new AceBaseServerNotReadyError();
    }
}
//# sourceMappingURL=server.js.map