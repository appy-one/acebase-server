/// <reference types="node" />
import { AceBaseStorageSettings } from 'acebase';
import { AceBaseServerEmailSettings } from './email';
export declare type AceBaseServerHttpsSettings = {
    enabled?: boolean;
    keyPath?: string;
    certPath?: string;
    pfxPath?: string;
    passphrase?: string;
} & ({
    keyPath: string;
    certPath: string;
} | {
    pfxPath: string;
    passphrase: string;
} | {});
export declare class AceBaseServerHttpsConfig {
    enabled: boolean;
    key?: Buffer;
    cert?: Buffer;
    pfx?: Buffer;
    passphrase?: string;
    constructor(settings: AceBaseServerHttpsSettings);
}
export declare enum AUTH_ACCESS_DEFAULT {
    DENY_ALL = "deny",
    ALLOW_ALL = "allow",
    ALLOW_AUTHENTICATED = "auth"
}
export declare class AceBaseServerAuthenticationSettings {
    /**
     * Whether to enable authorization. Without authorization the entire db can be read and written to by anyone (not recommended 🤷🏼‍♂️)
     */
    readonly enabled: boolean;
    /**
     * Whether new users creation is allowed for anyone, or just the admin
     */
    readonly allowUserSignup: boolean;
    /**
     * How many new users can sign up per hour per IP address. not implemented yet
     */
    readonly newUserRateLimit: number;
    /**
     * How many minutes before access tokens expire. 0 for no expiration. (not implemented yet)
     */
    readonly tokensExpire: number;
    /**
     * When the server runs for the first time, what defaults to use to generate the rules.json file with. Options are: 'auth' (only authenticated access to db, default), 'deny' (deny access to anyone except admin user), 'allow' (allow access to anyone)
     */
    readonly defaultAccessRule: AUTH_ACCESS_DEFAULT;
    /**
     * When the server runs for the first time, what password to use for the admin user. If not supplied, a generated password will be used and shown ONCE in the console output.
     */
    readonly defaultAdminPassword?: string;
    /**
     * Whether to use a separate database for auth and logging. 'v2' will store data in auth.db, which is NOT TESTED YET!
     */
    readonly separateDb: boolean | 'v2';
    constructor(settings: Partial<AceBaseServerAuthenticationSettings>);
}
/**
 * TODO: Use AceBaseTransactionLogSettings from 'acebase/src/storage-acebase.js'
 */
export declare class AceBaseServerTransactionSettings {
    /**
     * Whether to enable transaction logging
     */
    log: boolean;
    /**
     * Max age in days to keep transactions in the log file
     */
    maxAge: number;
    /**
     * Whether database write operations should not wait until transaction has been logged
     */
    noWait: boolean;
    constructor(settings: Partial<AceBaseServerTransactionSettings>);
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
    role: 'master' | 'worker';
}
export declare type AceBaseServerSettings = Partial<{
    /**
     * Level of messages logged to console
    */
    logLevel: 'verbose' | 'log' | 'warn' | 'error';
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
}>;
export declare class AceBaseServerConfig {
    readonly logLevel: 'verbose' | 'log' | 'warn' | 'error';
    readonly host: string;
    readonly port: number;
    readonly path: string;
    readonly maxPayloadSize: string;
    readonly allowOrigin: string;
    readonly https: AceBaseServerHttpsConfig;
    readonly auth: AceBaseServerAuthenticationSettings;
    readonly email: AceBaseServerEmailSettings;
    readonly transactions: AceBaseServerTransactionSettings;
    readonly ipc: IPCClientSettings;
    readonly storage?: AceBaseStorageSettings;
    constructor(settings: AceBaseServerSettings);
}
