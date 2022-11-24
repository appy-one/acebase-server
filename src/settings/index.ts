import { AceBaseStorageSettings } from 'acebase';
import { readFileSync } from 'fs';
import { AceBaseServerEmailSettings } from './email';
import { Server } from 'http';

export type AceBaseServerHttpsSettings = { 
    enabled?: boolean;
    keyPath?: string; 
    certPath?: string
    pfxPath?: string; 
    passphrase?: string
} & (
    { keyPath: string; certPath: string } |
    { pfxPath: string; passphrase: string } |
    {}
)

export class AceBaseServerHttpsConfig {
    enabled: boolean = true;
    key?: Buffer;
    cert?: Buffer;
    pfx?: Buffer;
    passphrase?: string;

    constructor(settings: AceBaseServerHttpsSettings) {
        this.enabled = typeof settings === "object" && settings.enabled !== false;
        if (!this.enabled) { return; }
        if (settings.keyPath) {
            this.key = readFileSync(settings.keyPath);
            this.cert = readFileSync(settings.certPath);
        }
        else if (settings.pfxPath) {
            this.pfx = readFileSync(settings.pfxPath);
            this.passphrase = settings.passphrase;
        }
    }
}

export type AuthAccessDefault = 'deny'|'allow'|'auth';
export const AUTH_ACCESS_DEFAULT: { [key: string]: AuthAccessDefault } = {
    DENY_ALL: 'deny',
    ALLOW_ALL: 'allow',
    ALLOW_AUTHENTICATED: 'auth'
};

export class AceBaseServerAuthenticationSettings {

    /**
     * Whether to enable authorization. Without authorization the entire db can be read and written to by anyone (not recommended 🤷🏼‍♂️)
     */
    readonly enabled: boolean = true;

    /**
     * Whether new users creation is allowed for anyone, or just the admin
     */
    readonly allowUserSignup: boolean = false;

    /**
     * How many new users can sign up per hour per IP address. not implemented yet
     */
    readonly newUserRateLimit: number = 0;

    /**
     * How many minutes before access tokens expire. 0 for no expiration. (not implemented yet)
     */
    readonly tokensExpire: number = 0;

    /**
     * When the server runs for the first time, what defaults to use to generate the rules.json file with. Options are: 'auth' (only authenticated access to db, default), 'deny' (deny access to anyone except admin user), 'allow' (allow access to anyone)
     */
    readonly defaultAccessRule: AuthAccessDefault = AUTH_ACCESS_DEFAULT.ALLOW_AUTHENTICATED;

    /**
     * When the server runs for the first time, what password to use for the admin user. If not supplied, a generated password will be used and shown ONCE in the console output.
     */
    readonly defaultAdminPassword?: string;

    /**
     * Whether to use a separate database for auth and logging. 'v2' will store data in auth.db, which is NOT TESTED YET!
     */
    readonly separateDb: boolean|'v2' = false;

    constructor(settings: Partial<AceBaseServerAuthenticationSettings>) {
        if (typeof settings !== "object") { settings = {}; }
        if (typeof settings.enabled === 'boolean') { this.enabled = settings.enabled; }
        if (typeof settings.allowUserSignup === 'boolean') { this.allowUserSignup = settings.allowUserSignup; }
        if (typeof settings.newUserRateLimit === 'number') { this.newUserRateLimit = settings.newUserRateLimit; }
        if (typeof settings.tokensExpire === 'number') { this.tokensExpire = settings.tokensExpire; }
        if (typeof settings.defaultAccessRule === 'string') { this.defaultAccessRule = settings.defaultAccessRule; }
        if (typeof settings.defaultAdminPassword === 'string') { this.defaultAdminPassword = settings.defaultAdminPassword; }
        if (typeof (settings as any).seperateDb === 'boolean') { this.separateDb = (settings as any).seperateDb; } // Handle previous _wrong_ spelling
        if (typeof settings.separateDb === 'boolean') { this.separateDb = settings.separateDb; }
    }
}

/**
 * TODO: Use AceBaseTransactionLogSettings from acebase
 */
export class AceBaseServerTransactionSettings {
    /**
     * Whether to enable transaction logging
     */
    log: boolean = false;

    /**
     * Max age in days to keep transactions in the log file
     */
    maxAge: number = 30;

    /**
     * Whether database write operations should not wait until transaction has been logged
     */
    noWait: boolean = false;

    constructor(settings: Partial<AceBaseServerTransactionSettings>) {
        if (typeof settings !== 'object') { return; }
        if (typeof settings.log === 'boolean') { this.log = settings.log; }
        if (typeof settings.maxAge === 'number') { this.maxAge = settings.maxAge; }
        if (typeof settings.noWait === 'boolean') { this.noWait = settings.noWait; }
    }
}

export interface IPCClientSettings {
    /**
     * IPC Server host to connect to. Default is `"localhost"`
     */
    host?: string;

    /**
     * IPC Server port number
     */
    port: number;

    /**
     * Whether to use a secure connection to the server. Strongly recommended if `host` is not `"localhost"`. Default is `false`
     */
    ssl?: boolean;

    /**
     * Token used in the IPC Server configuration (optional). The server will refuse connections using the wrong token.
     */
    token?: string;

    /**
     * Determines the role of this IPC client. Only 1 process can be assigned the 'master' role, all other processes must use the role 'worker'
     */
    role: 'master'|'worker';
}

export type AceBaseServerSettings = Partial<{
    /** 
     * Level of messages logged to console 
    */
    logLevel: 'verbose'|'log'|'warn'|'error';

    /** 
     * ip or hostname to start the server on 
    */
    host: string;

    /** 
     * port number the server will be listening 
     */
    port: number;

    /** 
     * target directory path to store/open the database. Default is '.' 
     */
    path: string;

    /** 
     * Whether to use secure sockets layer (ssl) 
     */
    https: AceBaseServerHttpsSettings;

    /**
     * Provide your own server for AceBase to use
     */
    server: Server;

    /**
     * Root for the AceBase routes
     */
    route: string;

    /** 
     * settings that define if and how authentication is used 
     */
    authentication: Partial<AceBaseServerAuthenticationSettings>;

    /** 
     * maximum size to allow for posted data, eg for updating nodes. Default is '10mb' 
     */
    maxPayloadSize: string;

    /** 
     * Value to use for Access-Control-Allow-Origin CORS header. Default is '*' 
     */
    allowOrigin: string;

    /** 
     * Email settings that enable AceBaseServer to send e-mails, eg for welcoming new users, to reset passwords, notify of new sign ins etc 
     */
    email: AceBaseServerEmailSettings;

    /** 
     * Transaction logging settings. Warning: BETA stage, do NOT use in production yet 
     */
    transactions: Partial<AceBaseServerTransactionSettings>;

    /** 
     * IPC settings for pm2 or cloud-based clusters. BETA stage, see https://github.com/appy-one/acebase-ipc-server 
     */
    ipc: IPCClientSettings;

    /** 
     * Allows overriding of default storage settings used by the database. ALPHA stage 
     */
    storage: AceBaseStorageSettings;
}>

export class AceBaseServerConfig {

    readonly logLevel: 'verbose'|'log'|'warn'|'error' = 'log';
    readonly host: string = 'localhost';
    readonly port: number = 3000;
    readonly path: string = '.';
    readonly maxPayloadSize: string = '10mb';
    readonly allowOrigin: string = '*';
    readonly https: AceBaseServerHttpsConfig;
    readonly server?: Server;
    readonly route: string = "/";
    readonly auth: AceBaseServerAuthenticationSettings;
    readonly email: AceBaseServerEmailSettings;
    readonly transactions: AceBaseServerTransactionSettings;
    readonly ipc: IPCClientSettings;
    readonly storage?: AceBaseStorageSettings;

    constructor(settings: AceBaseServerSettings) {
        if (typeof settings !== "object") { settings = {}; }
        if (typeof settings.logLevel === 'string') { this.logLevel = settings.logLevel; }
        if (typeof settings.host === 'string') { this.host = settings.host; }
        if (typeof settings.port === 'number') { this.port = settings.port; }
        if (typeof settings.path === 'string') { this.path = settings.path; }
        if (typeof settings.server === 'object') { this.server = settings.server; }
        if (typeof settings.route === 'string') { 
            this.route = settings.route; 
            if (!this.route.endsWith("/")) this.route += "/";
        }
        this.https = new AceBaseServerHttpsConfig(settings.https);
        this.auth = new AceBaseServerAuthenticationSettings(settings.authentication);
        if (typeof settings.maxPayloadSize === 'string') { this.maxPayloadSize = settings.maxPayloadSize; }
        if (typeof settings.allowOrigin === 'string') { this.allowOrigin = settings.allowOrigin; }
        if (typeof settings.email === 'object') { this.email = settings.email; }
        this.transactions = new AceBaseServerTransactionSettings(settings.transactions);
        this.ipc = settings.ipc;
        if (typeof settings.storage === 'object') { this.storage = settings.storage; }
    }
}