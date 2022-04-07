// import { EventEmitter } from 'events';
import { ColorStyle, DebugLogger, SimpleEventEmitter } from 'acebase-core';
import { AceBaseServerSettings, AceBaseServerConfig } from './settings';
import { createApp } from './routes/shared/http';
import { addWebsocketServer } from './routes/websocket';
import { RouteInitEnvironment } from './routes/shared/env';
import { ConnectedClient } from './routes/shared/clients';
import { AceBase, AceBaseLocalSettings, AceBaseStorageSettings } from 'acebase';
import { createServer } from 'http';
import { createServer as createSecureServer } from 'https';
import { IOAuth2Provider } from './oauth-providers/oauth-provider';
import { PathBasedRules } from './rules';
import { DbUserAccountDetails } from './routes/schema/user';
import { Api } from 'acebase-core/src/api';
import addCorsMiddleware from './routes/middleware/cors';
import addAuthenticionRoutes from './routes/auth';
import setupAuthentication from './auth';
import addDataRoutes from './routes/data';
import addDocsRoute from './routes/docs';
import addWebManagerRoutes from './routes/webmanager';
import addMetadataRoutes from './routes/meta';
import add404Middleware from './routes/middleware/404';

type PrivateStorageSettings = AceBaseStorageSettings & { info?: string; type?: 'data'|'transaction'|'auth'|'log' };
// type PrivateLocalSettings = AceBaseLocalSettings & { storage: PrivateStorageSettings };

export class AceBaseServerNotReadyError extends Error {
    constructor() { super('Server is not ready yet'); }
}

export class AceBaseServer extends SimpleEventEmitter {

    private _ready: boolean = false;
    get isReady() { return this._ready; }
    async ready(callback?: () => any) {
        if (!this._ready) {
            await this.once('ready');
        }
        callback?.();
    }

    readonly config: AceBaseServerConfig;
    get url() {
        return `http${this.config.https.enabled ? 's' : ''}://${this.config.host}:${this.config.port}`;
    }
    get transactionLoggingEnabled() {
        return this.config.transactions?.log === true;
    }

    readonly debug: DebugLogger;
    readonly db: AceBase;
    readonly authProviders: { [provider: string]: IOAuth2Provider } = {};

    constructor(dbname: string, options?: AceBaseServerSettings) {
        super();

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

        const dbOptions: AceBaseLocalSettings & { info: string } = {
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
        this.db = new AceBase(dbname, dbOptions);

        const otherDbsPath = `${this.config.path}/${this.db.name}.acebase`;
        const authDb = (() => {
            if (!this.config.auth.enabled) {
                return null;
            } 
            switch (this.config.auth.separateDb) {
                case true: return new AceBase('auth', { logLevel: dbOptions.logLevel, storage: <PrivateStorageSettings>{ path: otherDbsPath, removeVoidProperties: true, info: `${dbname} auth database` } });
                case 'v2': /*NOT TESTED YET*/return new AceBase(dbname, { logLevel: dbOptions.logLevel, storage: <PrivateStorageSettings>{ type: 'auth', path: this.config.path, removeVoidProperties: true, info: `${dbname} auth database` } });
                default: return this.db;
            }
        })();

        this.start({ authDb });
    }

    private async start(env: { authDb?: AceBase }) {
        const config = this.config;
        const db = this.db;
        const authDb = env.authDb;

        // Wait for databases to be ready to use
        await Promise.all([
            db.ready(),
            authDb?.ready()
        ]);

        // Create http server and app
        const app = createApp({ trustProxy: true, maxPayloadSize: this.config.maxPayloadSize });
        const server = config.https.enabled ? createSecureServer(config.https, app) : createServer(app);
        const clients = new Map<string, ConnectedClient>();

        const securityRef = authDb ? authDb === db ? db.ref('__auth__/security') : authDb.ref('security') : null;
        const authRef = authDb ? authDb === db ? db.ref('__auth__/accounts') : authDb.ref('accounts') : null;
        const logRef = authDb ? authDb === db ? db.ref('__log__') : authDb.ref('log') : null;

        // Setup rules
        const rulesFilePath = `${this.config.path}/${this.db.name}.acebase/rules.json`;
        const rules = new PathBasedRules(rulesFilePath, config.auth.defaultAccessRule, { db, debug: this.debug, authEnabled: this.config.auth.enabled });

        const routeEnv: RouteInitEnvironment = {
            config: this.config,
            server,
            db: db as AceBase & { api: Api },
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

        if (config.auth.enabled) {
            // Setup auth database
            await setupAuthentication(routeEnv);

            // Add auth endpoints
            const { resetPassword, verifyEmailAddress } = addAuthenticionRoutes(routeEnv);
            this.resetPassword = resetPassword;
            this.verifyEmailAddress = verifyEmailAddress;
        }

        // Add CORS middleware
        addCorsMiddleware(routeEnv);

        // Add metadata endpoints
        addMetadataRoutes(routeEnv);

        // Add data endpoints
        addDataRoutes(routeEnv);

        // Add webmanager endpoints
        addWebManagerRoutes(routeEnv);

        // If environment is development, add API docs
        if (process.env.NODE_ENV?.trim?.() === 'development') {
            this.debug.warn('DEVELOPMENT MODE: adding API docs endpoint at /docs');
            addDocsRoute(app);
        }

        // Allow adding custom routes
        this.extend = (method: 'get'|'put'|'post'|'delete', ext_path: string, handler: (req: Express.Request, res: Express.Response) => any) => {
            app[method.toLowerCase()](`/ext/${db.name}/${ext_path}`, handler);
        }
        
        // Create websocket server
        addWebsocketServer(routeEnv);

        // Last but not least, add 404 handler
        add404Middleware(routeEnv);

        // Start listening
        server.listen(config.port, config.host, () => {
            // Ready!!
            this.debug.log(`"${db.name}" database server running at ${this.url}`);
            this._ready = true;
            this.emitOnce(`ready`);
        });

        // Setup pause and resume methods
        let paused = false;
        this.pause = async () => {
            if (paused) { throw new Error('Server is already paused'); }
            server.close();
            this.debug.warn(`Paused "${db.name}" database server at ${this.url}`);
            this.emit('pause');
            paused = true;
        };
        this.resume = async () => {
            if (!paused) { throw new Error('Server is not paused'); }
            return new Promise(resolve => {
                server.listen(config.port, config.host, () => {
                    this.debug.warn(`Resumed "${db.name}" database server at ${this.url}`);
                    this.emit('resume');
                    paused = false;
                    resolve();
                });
            })
        };

        // Handle SIGINT and shutdown requests
        const shutdown = async (request: { sigint: boolean }) => {
            this.debug.warn('shutting down server');
            routeEnv.rules.stop();

            const getConnectionsCount = () => {
                return new Promise<number>((resolve, reject) => {
                    server.getConnections((err, connections) => {
                        if (err) { reject(err); }
                        else { resolve(connections); }
                    });
                });
            };
            const connections = await getConnectionsCount();
            this.debug.log(`Server has ${connections} connections`);

            await new Promise((resolve) => {
                const interval = setInterval(async () => {
                    const connections = await getConnectionsCount();
                    this.debug.log(`Server still has ${connections} connections`);
                }, 5000);
                interval.unref();

                server.close(resolve);

                console.log(`Closing ${clients.size} websocket connections`);
                clients.forEach((client, id) => {
                    const socket = client.socket;
                    socket.once('disconnect', reason => {
                        console.log(`Socket ${socket.id} disconnected: ${reason}`);
                    })
                    socket.disconnect(true);
                });

                // clients.list.slice().forEach(client => {
                //     client.socket.disconnect(true);
                // });
            });
            this.debug.warn('closing database');
            await db.close();
            this.debug.warn('shutdown complete');

            // Emit events to let the outside world know we shut down. 
            // This is especially important if this instance was running in a Node.js cluster: the process will
            // not exit automatically after this shutdown because Node.js' IPC channel between worker and master is still open.
            // By sending these events, the cluster manager can determine if it should (and when to) execute process.exit()
            
            // process.emit('acebase-server-shutdown');             // Emit on process
            process.emit('beforeExit', request.sigint ? 130 : 0);   // Emit on process
            try {
                process.send && process.send('acebase-server-shutdown'); // Send to master process when running in a Node.js cluster
            }
            catch(err) {
                // IPC Channel has apparently been closed already
            }
            this.emit('shutdown'); // Emit on AceBaseServer instance
        };
        this.shutdown = async () => await shutdown({ sigint: false });
        process.on('SIGINT', () => shutdown({ sigint: true }));
    }

    resetPassword (clientIp: string, code: string, newPassword: string): Promise<DbUserAccountDetails> {
        throw new AceBaseServerNotReadyError();
    }

    verifyEmailAddress (clientIp: string, code: string): Promise<void> {
        throw new AceBaseServerNotReadyError();
    }

    shutdown() {
        throw new AceBaseServerNotReadyError();
    }

    pause(): Promise<void> {
        throw new AceBaseServerNotReadyError();
    }

    resume(): Promise<void> {
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
     extend(method: 'get'|'put'|'post'|'delete', ext_path: string, handler: (req: Express.Request, res: Express.Response) => void) {
        throw new AceBaseServerNotReadyError();
    }

    configAuthProvider(providerName: string, settings: any) {
        if (!this.config.auth.enabled) {
            throw new Error(`Authentication is not enabled`);
        }
        try {
            const { AuthProvider } = require('./oauth-providers/' + providerName);
            const provider = new AuthProvider(settings);
            this.authProviders[providerName] = provider;
            return provider;
        }
        catch(err) {
            throw new Error(`Failed to configure provider ${providerName}: ${err.message}`)
        }
    }
}