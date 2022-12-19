import { readFileSync } from 'fs';
export class AceBaseServerHttpsConfig {
    constructor(settings) {
        this.enabled = true;
        this.enabled = typeof settings === 'object' && settings.enabled !== false;
        if (!this.enabled) {
            return;
        }
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
export const AUTH_ACCESS_DEFAULT = {
    DENY_ALL: 'deny',
    ALLOW_ALL: 'allow',
    ALLOW_AUTHENTICATED: 'auth',
};
export class AceBaseServerAuthenticationSettings {
    constructor(settings) {
        /**
         * Whether to enable authorization. Without authorization the entire db can be read and written to by anyone (not recommended 🤷🏼‍♂️)
         */
        this.enabled = true;
        /**
         * Whether new users creation is allowed for anyone, or just the admin
         */
        this.allowUserSignup = false;
        /**
         * How many new users can sign up per hour per IP address. not implemented yet
         */
        this.newUserRateLimit = 0;
        /**
         * How many minutes before access tokens expire. 0 for no expiration. (not implemented yet)
         */
        this.tokensExpire = 0;
        /**
         * When the server runs for the first time, what defaults to use to generate the rules.json file with. Options are: 'auth' (only authenticated access to db, default), 'deny' (deny access to anyone except admin user), 'allow' (allow access to anyone)
         */
        this.defaultAccessRule = AUTH_ACCESS_DEFAULT.ALLOW_AUTHENTICATED;
        /**
         * Whether to use a separate database for auth and logging. 'v2' will store data in auth.db, which is NOT TESTED YET!
         */
        this.separateDb = false;
        if (typeof settings !== 'object') {
            settings = {};
        }
        if (typeof settings.enabled === 'boolean') {
            this.enabled = settings.enabled;
        }
        if (typeof settings.allowUserSignup === 'boolean') {
            this.allowUserSignup = settings.allowUserSignup;
        }
        if (typeof settings.newUserRateLimit === 'number') {
            this.newUserRateLimit = settings.newUserRateLimit;
        }
        if (typeof settings.tokensExpire === 'number') {
            this.tokensExpire = settings.tokensExpire;
        }
        if (typeof settings.defaultAccessRule === 'string') {
            this.defaultAccessRule = settings.defaultAccessRule;
        }
        if (typeof settings.defaultAdminPassword === 'string') {
            this.defaultAdminPassword = settings.defaultAdminPassword;
        }
        if (typeof settings.seperateDb === 'boolean') {
            this.separateDb = settings.seperateDb;
        } // Handle previous _wrong_ spelling
        if (typeof settings.separateDb === 'boolean') {
            this.separateDb = settings.separateDb;
        }
    }
}
/**
 * TODO: Use AceBaseTransactionLogSettings from acebase
 */
export class AceBaseServerTransactionSettings {
    constructor(settings) {
        /**
         * Whether to enable transaction logging
         */
        this.log = false;
        /**
         * Max age in days to keep transactions in the log file
         */
        this.maxAge = 30;
        /**
         * Whether database write operations should not wait until transaction has been logged
         */
        this.noWait = false;
        if (typeof settings !== 'object') {
            return;
        }
        if (typeof settings.log === 'boolean') {
            this.log = settings.log;
        }
        if (typeof settings.maxAge === 'number') {
            this.maxAge = settings.maxAge;
        }
        if (typeof settings.noWait === 'boolean') {
            this.noWait = settings.noWait;
        }
    }
}
export class AceBaseServerConfig {
    constructor(settings) {
        this.logLevel = 'log';
        this.host = 'localhost';
        this.port = 3000;
        this.path = '.';
        this.maxPayloadSize = '10mb';
        this.allowOrigin = '*';
        this.rootPath = '';
        this.sponsor = false;
        this.logColors = true;
        if (typeof settings !== 'object') {
            settings = {};
        }
        if (typeof settings.logLevel === 'string') {
            this.logLevel = settings.logLevel;
        }
        if (typeof settings.host === 'string') {
            this.host = settings.host;
        }
        if (typeof settings.port === 'number') {
            this.port = settings.port;
        }
        if (typeof settings.path === 'string') {
            this.path = settings.path;
        }
        if (typeof settings.server === 'object') {
            this.server = settings.server;
        }
        if (typeof settings.rootPath === 'string') {
            this.rootPath = settings.rootPath.replace(/^\/|\/$/g, '');
        }
        this.https = new AceBaseServerHttpsConfig(settings.https);
        this.auth = new AceBaseServerAuthenticationSettings(settings.authentication);
        if (typeof settings.maxPayloadSize === 'string') {
            this.maxPayloadSize = settings.maxPayloadSize;
        }
        if (typeof settings.allowOrigin === 'string') {
            this.allowOrigin = settings.allowOrigin;
        }
        if (typeof settings.email === 'object') {
            this.email = settings.email;
        }
        this.transactions = new AceBaseServerTransactionSettings(settings.transactions);
        this.ipc = settings.ipc;
        if (typeof settings.storage === 'object') {
            this.storage = settings.storage;
        }
        if (typeof settings.sponsor === 'boolean') {
            this.sponsor = settings.sponsor;
        }
        if (typeof settings.logColors === 'boolean') {
            this.logColors = settings.logColors;
        }
    }
}
//# sourceMappingURL=index.js.map