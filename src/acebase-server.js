
const { EventEmitter } = require('events');
const { AceBase, AceBaseSettings } = require('acebase');
const { ID, Transport, DataSnapshot, PathInfo, Utils } = require('acebase-core');
const fs = require('fs');
const crypto = require('crypto');

class AceBaseClusterSettings {
    constructor(settings) {
        this.enabled = typeof settings === "object";
        this.isMaster = this.enabled && settings.isMaster;
        this.master = this.enabled ? settings.master : process;
        this.workers = this.enabled ? settings.workers : [process];
    }
}

class AceBaseServerHttpsSettings {
    /**
     * 
     * @param {{keyPath:string, certPath:string}|{ pfxPath:string, passphrase:string }} settings 
     */
    constructor(settings) {
        this.enabled = typeof settings === "object" && settings.enabled !== false;
        if (!this.enabled) { return; }
        if (settings.keyPath) {
            this.key = fs.readFileSync(settings.keyPath);
            this.cert = fs.readFileSync(settings.certPath);
        }
        else if (settings.pfxPath) {
            this.pfx = fs.readFileSync(settings.pfxPath);
            this.passphrase = settings.passphrase;
        }
    }
}

class AceBaseServerAuthenticationSettings {
    /**
     * 
     * @param {{enabled?: boolean, allowUserSignup?: boolean, defaultAccessRule?: string, defaultAdminPassword?: string}} settings 
     */
    constructor(settings) {
        if (typeof settings !== "object") { settings = {}; }
        this.enabled = typeof settings.enabled === 'boolean' ? settings.enabled : true; // if authorization is enabled, without authorization anyone can do anything
        this.allowUserSignup = typeof settings.allowUserSignup === 'boolean' ? settings.allowUserSignup : false; // If new users creation is allowed for anyone, or just the admin
        this.newUserRateLimit = typeof settings.newUserRateLimit === 'number' ? settings.newUserRateLimit : 0; // how many new users per hour per IP address. not implemented yet
        this.tokensExpire = typeof settings.tokensExpire === 'number' ? settings.tokensExpire : 0; // how many minutes before access tokens expire. 0 for no expiration. not implemented yet
        this.defaultAccessRule = settings.defaultAccessRule || AceBaseServerAuthenticationSettings.ACCESS_DEFAULT.ALLOW_AUTHENTICATED;
        this.defaultAdminPassword = typeof settings.defaultAdminPassword === 'string' ? settings.defaultAdminPassword : undefined;
    }

    static get ACCESS_DEFAULT() {
        return {
            DENY_ALL: 'deny',
            ALLOW_ALL: 'allow',
            ALLOW_AUTHENTICATED: 'auth'
        }
    }
}

class AceBaseServerSettings {

    /**
     * 
     * @param {object} [settings] 
     * @param {string} [settings.logLevel='log']
     * @param {string} [settings.host='localhost']
     * @param {number} [settings.port=3000]
     * @param {string} [settings.path='.']
     * @param {string} [settings.maxPayloadSize='10mb']
     * @param {string} [settings.allowOrigin='*']
     * @param {AceBaseServerHttpsSettings} [settings.https] { keyPath:string, certPath:string} | { pfxPath:string, passphrase:string }
     * @param {AceBaseServerAuthenticationSettings} [settings.auth]
     * 
     */
    constructor(settings) {
        if (typeof settings !== "object") { settings = {}; }
        this.logLevel = settings.logLevel || "log"; //"error";
        this.host = settings.host || "localhost";
        this.port = settings.port || 3000;
        this.path = settings.path || '.';
        this.cluster = new AceBaseClusterSettings(settings.cluster);
        this.https = new AceBaseServerHttpsSettings(settings.https);
        this.authentication = new AceBaseServerAuthenticationSettings(settings.authentication);
        this.maxPayloadSize = settings.maxPayloadSize || '10mb';
        this.allowOrigin = settings.allowOrigin || '*';
    }
}

class AccessDeniedError extends Error { }

class ClientSubscription {
    constructor(obj) {
        this.callback = obj.callback;
        this.disconnectedCallback = null;
        this.missedEvents = [];
    }
}
class MissedClientEvent {
    constructor(obj) {
        this.time = Date.now();
        this.event = obj.event;
        this.subscriptionPath = obj.subscriptionPath;
        this.path = obj.path;
    }
}
class Client {
    constructor(obj) {
        // Object.assign(this, obj);
        /** @type {SocketIO.Socket} */
        this.socket = obj.socket;
        /** @type {string} */
        this.id = this.socket.id;
        /** @type {DbUserAccountDetails} */
        this.user = obj.user;
        /** @type {{ [path: string]: ClientSubscription }} */
        this.subscriptions = {};
        /** @type {MissedClientEvent[]} */
        this.missedEvents = [];
    }

    subscribe(requestId, event, subscriptionPath) {
        // Check if user has access
        if (!userHasAccess(this.user, subscriptionPath, false)) {
            authDb.ref('log').push({ action: `access_denied`, uid: this.user ? this.user.uid : '-', path: subscriptionPath });
            this.socket.emit('result', {
                success: false,
                reason: `access_denied`,
                req_id: requestId
            });
            return;
        }

        const callback = (err, path, currentValue, previousValue) => {
            if (err) {
                return;
            }
            if (!this.socket) {
                // Client is currently disconnected. Keep track of missed events in case
                // the client comes back again. 
                // TODO: Move from memory to eventsDb after a while
                this.missedEvents.push(new MissedClientEvent({ event, subscriptionPath, path, currentValue, previousValue }));
                return;
            }
            if (!userHasAccess(this.user, path, false)) {
                if (subscriptionPath.indexOf('*') < 0 && subscriptionPath.indexOf('$') < 0) {
                    // Could potentially be very many callbacks, so
                    // DISABLED: authDb.ref('log').push({ action: `access_revoked`, uid: client.user ? client.user.uid : '-', path: subscriptionPath });
                    // Only log when user subscribes again
                    this.socket.emit('result', {
                        success: false,
                        reason: `access_denied`,
                        req_id: requestId
                    });
                }
                return;
            }
            let val = Transport.serialize({
                current: currentValue,
                previous: previousValue
            });
            console.log(`Sending data event "${event}" for path "/${path}" to client ${this.id}`);
            this.socket.emit("data-event", {
                subscr_path: subscriptionPath,
                path,
                event,
                val
            });
        };

    }
}

/**
 * @typedef {object} DbUserAccountDetails
 * @property {string} [uid] uid, not stored in database object (uid is the node's key)
 * @property {string} [username] username
 * @property {string} [email] email address
 * @property {boolean} [email_verified] if the supplied e-mail address has been verified
 * @property {boolean} [is_disabled] if the account has been disabled
 * @property {string} [display_name]
 * @property {string} password password hash
 * @property {string} password_salt random password salt used to secure password hash
 * @property {boolean} [change_password] TODO: whether the user has to change their password
 * @property {Date} [change_password_requested] TODO: date/time the password reset was requested
 * @property {Date} [change_password_before] TODO: date/time the user must have changed their password
 * @property {Date} created date/time the account was created
 * @property {string} [created_ip] creation ip address
 * @property {Date} [last_signin] date/time of last sign in
 * @property {string} [last_signin_ip] ip address of last sign in
 * @property {Date} [prev_signin] date/time of previous sign in
 * @property {string} [prev_signin_ip] ip address of previous sign in
 * @property {Date} [last_signout] date/time user last signed out
 * @property {string} [last_signout_ip] ip address of last sign out
 * @property {string} [access_token] access token that allows access after signing in
 * @property {Date} [access_token_created] date/time access token was generated
 * @property {{ [key:string]: string|number|boolean }} settings additional settings for this user, can be used to store eg a profile picture uri
 */

 /**
  * @param {DbUserAccountDetails} account 
  */
function getPublicAccountDetails(account) {
    return {
        uid: account.uid, 
        username: account.username, 
        email: account.email,
        displayName: account.display_name, 
        created: account.created,
        prevSignin: account.prev_signin,
        prevSigninIp: account.prev_signin_ip,
        lastSignin: account.last_signin,
        lastSigninIp: account.last_signin_ip,
        changePassword: account.change_password,
        changePasswordRequested: account.change_password_requested,
        changePasswordBefore: account.change_password_before,
        settings: account.settings        
    };
}

function createPublicAccessToken(uid, ip, dbToken) {
    let obj = {
        t:dbToken,
        c:Date.now(),
        u:uid,
        i:ip
    };
    let str = JSON.stringify(obj);
    str = Buffer.from(str).toString('base64');
    return 'a' + str; // version a
}

/**
 * 
 * @param {string} accessToken 
 * @returns {{ access_token?: string, uid?: string, created?: number, ip?: string }}
 */
function decodePublicAccessToken(accessToken) {
    if (!accessToken || accessToken[0] !== 'a') { return {}; }
    try {
        let str = accessToken.slice(1);
        str = Buffer.from(str, 'base64').toString();
        let obj = JSON.parse(str);
        return {
            access_token: obj.t,
            uid: obj.u,
            created: obj.c,
            ip: obj.i
        }
    }
    catch(err) {
        return {};
    }
}

class AceBaseServer extends EventEmitter {

    /**
     * 
     * @param {string} dbname 
     * @param {AceBaseServerSettings} options 
     */
    constructor(dbname, options = new AceBaseServerSettings()) {

        options = new AceBaseServerSettings(options);
        const app = require('express')();
        const bodyParser = require('body-parser');
        const server = options.https.enabled ? require('https').createServer(options.https, app) : require('http').createServer(app);
        const io = require('socket.io').listen(server);
        
        super();
        this.config = {
            hostname: options.host,
            port: options.port,
            get url() {
                return `http${this.https.enabled ? 's' : ''}://${this.hostname}:${this.port}`;
            },
            https: options.https,
            authentication: options.authentication
        };
        this.url = this.config.url; // Is this used?
        
        if (options.authentication.enabled && !options.https.enabled) {
            console.error(`WARNING: Authentication is enabled, but the server is not using https. Any password and other data transmitted may be intercepted!`);
        }
        else if (!options.https.enabled) {
            console.error(`WARNING: Server is not using https, any data transmitted may be intercepted!`);
        }
        if (!options.authentication.enabled) {
            console.error(`WARNING: Authentication is disabled, *anyone* can do *anything* with your data!`);
        }

        const dbOptions = {
            logLevel: options.logLevel,
            storage: {
                cluster: options.cluster,
                path: options.path
            },
        };

        const db = new AceBase(dbname, dbOptions);
        const otherDbsPath = `${options.path}/${dbname}.acebase`;
        // const eventsDb = new AceBase('events', { logLevel: dbOptions.logLevel,  storage: { path: otherDbsPath, removeVoidProperties: true } })
        // const logsDb = new AceBase('logs', { logLevel: dbOptions.logLevel,  storage: { path: otherDbsPath, removeVoidProperties: true } })
        const authDb = options.authentication.enabled
            ? new AceBase('auth', { logLevel: dbOptions.logLevel,  storage: { path: otherDbsPath, removeVoidProperties: true } })
            : null;

        // process.on("unhandledRejection", (reason, p) => {
        //     console.log("Unhandled Rejection at: ", reason.stack);
        // });

        const createPasswordHash = (password) => {
            let length = 16;
            let salt = crypto.randomBytes(Math.ceil(length/2)).toString('hex').slice(0,length);
            let hash = crypto.createHmac('sha512', salt).update(password).digest('hex');
            return {
                salt,
                hash
            }
        }
        const getOldPasswordHash = (password) => {
            // Backward compatibility with old saltless md5 passwords. 
            // Becomes obsolete once all passwords have been updated
            return crypto.createHash('md5').update(password).digest('hex');
        }
        const getPasswordHash = (password, salt) => {
            return crypto.createHmac('sha512', salt).update(password).digest('hex');
        }

        const readyPromises = [
            db.ready(),
            authDb ? authDb.ready() : null
        ];
        
        Promise.all(readyPromises)
        .then(() => {
            //console.log(`Database "${dbname}" is ready to use`);

            let accessRules = {};
            const authRef = authDb ? authDb.ref('accounts') : null; // db.ref('__auth__');
            if (options.authentication.enabled) {
                // NEW: Make sure there is an administrator account in the database
                authRef.child('admin').transaction(snap => {

                    /** @type {DbUserAccountDetails} */
                    let adminAccount = snap.val();
                    if (!snap.exists()) {
                        // Use provided default password, or generate one:
                        const adminPassword = options.authentication.defaultAdminPassword  || Array.prototype.reduce.call('abcedefghijkmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ012345789!@#$%&', (password, c, i, chars) => {
                            if (i > 15) { return password; }
                            return password + chars[Math.floor(Math.random() * chars.length)];
                        }, '');

                        const pwd = createPasswordHash(adminPassword);
                        adminAccount = {
                            username: 'admin',
                            email: null, // no email address for admin
                            display_name: `${dbname} AceBase admin`,
                            password: pwd.hash,
                            password_salt: pwd.salt,
                            change_password: true,  // flags that password must be changed. Not implemented yet
                            created: new Date(),
                            access_token: null, // Will be set upon login, so bearer authentication strategy can find user with this token
                        };
                        console.error(`__________________________________________________________________`);
                        console.error(``);
                        console.error(`IMPORTANT: Admin account created`);
                        console.error(`You need the admin account to remotely administer the database`);
                        console.error(`Use the following credentials to authenticate an AceBaseClient:`);
                        console.error(``);
                        console.error(`    username: admin`);
                        console.error(`    password: ${adminPassword}`);
                        console.error(``);
                        console.error(`THIS IS ONLY SHOWN ONCE!`);
                        console.error(`__________________________________________________________________`);
                        return adminAccount; // Save it
                    }
                    else if (options.authentication.defaultAdminPassword) {
                        let passwordHash;
                        if (!adminAccount.password_salt) {
                            // Old md5 password hash?
                            passwordHash = getOldPasswordHash(options.authentication.defaultAdminPassword);
                        }
                        else {
                            passwordHash = getPasswordHash(options.authentication.defaultAdminPassword, adminAccount.password_salt);
                        }
                        if (adminAccount.password === passwordHash) {
                            console.error(`WARNING: default password for admin user was not changed!`);

                            if (!adminAccount.password_salt) {
                                // Create new password hash
                                const pwd = createPasswordHash(options.authentication.defaultAdminPassword);
                                adminAccount.password = pwd.hash;
                                adminAccount.password_salt = pwd.salt;
                                return adminAccount; // Save it
                            }
                        }
                    }
                })
                .then(() => {
                    authDb.indexes.create('accounts', 'username');
                    authDb.indexes.create('accounts', 'email');
                    authDb.indexes.create('accounts', 'access_token');
                });

                // Check if there is a rules file, load it or generate default
                const rulesFilePath = `${options.path}/${dbname}.acebase/rules.json`;
                const defaultAccessRule = (def => {
                    switch (def) {
                        case AceBaseServerAuthenticationSettings.ACCESS_DEFAULT.ALLOW_AUTHENTICATED: {
                            return 'auth !== null';
                        }
                        case AceBaseServerAuthenticationSettings.ACCESS_DEFAULT.ALLOW_ALL: {
                            return true;
                        }
                        case AceBaseServerAuthenticationSettings.ACCESS_DEFAULT.DENY_ALL: {
                            return false;
                        }
                        default: {
                            console.error(`Unknown defaultAccessRule "${def}"`);
                            return false;
                        }
                    }
                })(options.authentication.defaultAccessRule);
                const defaultRules = {
                    rules: {
                        ".read": defaultAccessRule,
                        ".write": defaultAccessRule
                    }
                };
                if (!fs.existsSync(rulesFilePath)) {
                    // Default: deny access
                    accessRules = defaultRules;
                    // Write defaults
                    fs.writeFileSync(rulesFilePath, JSON.stringify(accessRules, null, 4));
                }
                else {
                    try {
                        const json = fs.readFileSync(rulesFilePath);
                        const obj = JSON.parse(json);
                        if (typeof obj !== 'object' || typeof obj.rules !== 'object') {
                            throw new Error(`malformed rules object`);
                        }
                        accessRules = obj;
                    }
                    catch (err) {
                        console.error(`Failed to read rules from "${rulesFilePath}": ${err.message}`);
                        accessRules = defaultRules;
                    }
                }

                // Convert string rules to functions that can be executed
                const processRules = (parent, variables) => {
                    Object.keys(parent).forEach(key => {
                        let rule = parent[key];
                        if (['.read', '.write', '.validate'].includes(key) && typeof rule === 'string') {
                            // Convert to function
                            const text = rule;
                            rule = eval(`(env => { const { now, root, newData, data, auth, ${variables.join(', ')} } = env; return ${text}; })`);
                            rule.getText = () => {
                                return text;
                            }
                            parent[key] = rule;
                        }
                        else if (key.startsWith('$')) {
                            variables.push(key);
                        }
                        if (typeof rule === 'object') {
                            processRules(rule, variables.slice());
                        }
                    });
                };
                processRules(accessRules.rules, []);                
            }
            
            /**
             * 
             * @param {DbUserAccountDetails} user 
             * @param {string} path 
             * @param {boolean} [write] 
             * @param {(details: { code: string, message: string, [key:string]: any }) => void} denyDetailsCallback 
             */
            const userHasAccess = (user, path, write = false, denyDetailsCallback = undefined) => {
                // Process rules, find out if signed in user is allowed to read/write
                // Defaults to false unless a rule is found that tells us otherwise

                if (!options.authentication.enabled) {
                    // Authentication is disabled, anyone can do anything. Not really a smart thing to do!
                    return true;
                }
                else if (user && user.uid === 'admin') {
                    // Always allow admin access
                    return true;
                }

                const env = { now: Date.now(), auth: user || null };
                const pathKeys = PathInfo.getPathKeys(path);
                let rule = accessRules.rules;
                let rulePath = [];
                while(true) {
                    if (!rule) { 
                        denyDetailsCallback && denyDetailsCallback({ code: 'no_rule', message: 'No rules set for requested path, defaulting to false' });
                        return false; 
                    }
                    let checkRule = write ? rule['.write'] : rule['.read'];
                    if (typeof checkRule === 'boolean') { 
                        const allow = checkRule; 
                        if (!allow) {
                            denyDetailsCallback && denyDetailsCallback({ code: 'rule', message: 'Acces denied by set rule', rule: checkRule, rulePath: rulePath.join('/') });
                        }
                        return allow;
                    }
                    if (typeof checkRule === 'function') {
                        try {
                            // Execute rule function
                            let allow = checkRule(env);
                            if (!allow) {
                                denyDetailsCallback && denyDetailsCallback({ code: 'rule', message: 'Acces denied by set rule', rule: checkRule.getText(), rulePath: rulePath.join('/') });
                            }
                            return allow;
                        }
                        catch(err) {
                            // If rule execution throws an exception, don't allow. Can happen when rule is "auth.uid === '...'", and auth is null because the user is not signed in
                            denyDetailsCallback && denyDetailsCallback({ code: 'exception', message: 'Acces denied by set rule', rule: checkRule.getText(), rulePath: rulePath.join('/'), details: err });
                            return false; 
                        }
                    }
                    if (pathKeys.length === 0) {
                        return false;
                    }
                    let nextKey = pathKeys.shift();
                    // if nextKey is '*' or '$something', rule[nextKey] will be undefined (or match a variable) so there is no 
                    // need to change things here for usage of wildcard paths in subscriptions
                    if (typeof rule[nextKey] === 'undefined') {
                        // Check if current rule has a wildcard child
                        const wildcardKey = Object.keys(rule).find(key => key[0] === '$');
                        if (wildcardKey) { env[wildcardKey] = nextKey; }
                        nextKey = wildcardKey;
                    }
                    nextKey && rulePath.push(nextKey);
                    rule = rule[nextKey];
                }
            };

            const sendNotAuthenticatedError = (res, code, message) => {
                res.statusCode = 401; // Unauthorized (not unauthenticated)
                res.statusMessage = 'Not Authenticated';
                res.send({ code, message });
            };

            const sendUnauthorizedError = (res, code, message) => {
                res.statusCode = 403; // Forbidden
                res.statusMessage = 'Unauthorized';
                res.send({ code, message });
            };

            /** @type {Map<string, User>} Maps uid's to users  */
            const _authCache = new Map();

            /**
             * 
             * @param {string} type 'username', 'email' or 'access_token'
             * @param {string} username (or email when param type === 'email')
             * @param {string} password 
             * @param {(err: Error, user?: DbUserAccountDetails, details?: { code: string, message: string }) => void} callback 
             */
            const signIn = function(req, type, username, password, callback) {
                let tokenDetails;
                if (type === 'access_token') {
                    tokenDetails = decodePublicAccessToken(username);
                    if (!tokenDetails.access_token) {
                        const code = 'invalid_token';
                        authDb.ref('log').push({ action: `signin`, type, username, success: false, code, ip: req.ip, date: new Date() });
                        return callback(null, false, { code, message: `Incorrect ${type}` });
                    }
                    username = tokenDetails.access_token;
                }
                return authRef.query()
                .filter(type, '==', username)
                .get()
                .then(snaps => {
                    if (snaps.length === 0) {
                        const code = 'not_found';
                        authDb.ref('log').push({ action: `signin`, type, username, success: false, code, ip: req.ip, date: new Date() });
                        return callback(null, false, { code, message: `Incorrect ${type}` });
                    }
                    else if (snaps.length > 1) {
                        const code = 'duplicate';
                        authDb.ref('log').push({ action: `signin`, type, username, success: false, code, count: snaps.length, ip: req.ip, date: new Date() });
                        return callback(null, false, { code, message: `${snaps.length} users found with the same ${type}. Contact your database administrator` });
                    }

                    /** @type {DataSnapshot} */ 
                    const snap = snaps[0];
                    /** @type {DbUserAccountDetails} */
                    const user = snap.val();
                    user.uid = snap.key;

                    if (user.is_disabled === true) {
                        return callback(null, false, { code: 'account_disabled', message: 'Your account has been disabled. Contact your database administrator' });
                    }
                    if (type === 'access_token' && tokenDetails.uid !== user.uid) {
                        const code = 'token_mismatch';
                        authDb.ref('log').push({ action: `signin`, type, username, ip: req.ip, date: new Date(), success: false, reason: code });
                        return callback(null, false, { code, message: 'Sign in again' });
                    }
                    if (type !== 'access_token') {
                        let hash = user.password_salt ? getPasswordHash(password, user.password_salt) : getOldPasswordHash(password);
                        if (user.password !== hash) {
                            const code = 'wrong_password';
                            authDb.ref('log').push({ action: `signin`, type, username, ip: req.ip, date: new Date(), success: false, reason: code });
                            return callback(null, false, { code, message: 'Incorrect password' });
                        }
                    }

                    // Keep track of properties to update, both in db and in our object
                    const updates = {
                        // Update prev / last sign in stats
                        prev_signin: user.last_signin,
                        prev_signin_ip: user.last_signin_ip,
                        last_signin: new Date(),
                        last_signin_ip: req.ip
                    };
                    
                    if (!user.password_salt) {
                        // OLD md5 password hash, convert to new salted hash
                        let pwd = createPasswordHash(password);
                        updates.password = pwd.hash;
                        updates.password_salt = pwd.salt;
                    }

                    if (type !== 'access_token' && !user.access_token) {
                        // Generate access token
                        updates.access_token = ID.generate();
                        updates.access_token_created = new Date();
                    }

                    // Update user object
                    Object.assign(user, updates);

                    // Update db
                    return snap.ref.update(updates)
                    .then(() => {

                        // Log history item
                        authDb.ref('log').push({ action: `signin`, type, username, ip: req.ip, date: new Date(), success: true });
    
                        // Add to cache
                        _authCache.set(user.uid, user);
    
                        // Bind user to current request
                        req.user = user;
    
                        return callback(null, user);
                    });
                })
                .catch(err => {
                    authDb.ref('log').push({ action: `signin`, type, username, ip: req.ip, date: new Date(), success: false, code: 'unexpected', message: err.message })
                    return callback(err);
                });
            };

            server.on("error", (err) => {
                console.log(err);
            });

            app.use(bodyParser.json({ limit: options.maxPayloadSize, extended: true }));

            app.use((req, res, next) => {
                res.set('Access-Control-Allow-Origin', options.allowOrigin);
                res.set('Access-Control-Allow-Methods', '*');
                res.set('Access-Control-Allow-Headers', '*');
                next();
            });

            if (options.authentication.enabled) {
                app.use((req, res, next) => {
                    const authorization = req.get('Authorization');
                    if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
                        const token = authorization.slice(7);
                        let tokenDetails;
                        try {
                            tokenDetails = decodePublicAccessToken(token);
                            if (!tokenDetails.uid || !tokenDetails.access_token) { throw new Error('invalid token'); }
                        }
                        catch(err) {
                            return sendNotAuthenticatedError(res, 'invalid_token', 'The passed token is invalid. Sign in again');
                        }

                        // Is this token cached?
                        const cachedUser = _authCache.get(tokenDetails.uid);
                        if (cachedUser) {
                            // Bind user to current request
                            req.user = cachedUser;

                            if (req.user && req.user.is_disabled === true) {
                                return sendNotAuthenticatedError(res, 'account_disabled', 'Your account has been disabled. Contact your database administrator');
                            }

                            return next();
                        }

                        // Not cached, query database to get user for this token
                        return signIn(req, 'access_token', token, null, (err, user, details) => {
                            if (err) {
                                return sendNotAuthenticatedError(res, details.code, details.message);
                            }
                            next();
                        });
                    }
                    next();
                });

                app.get(`/auth/${dbname}/state`, (req, res) => {
                    if (req.user) {
                        res.send({ signed_in: true, user: req.user });
                    }
                    else {
                        res.send({ signed_in: false });
                    }
                });

                app.post(`/auth/${dbname}/signin`, (req, res) => {
                    // if (!this.config.authentication.enabled) {
                    //     res.statusCode = 405;
                    //     return res.send('Disabled');
                    // }

                    const details = req.body;

                    /**
                     * 
                     * @param {Error} err 
                     * @param {DbUserAccountDetails} user 
                     * @param {{ code: string, message: string }} details 
                     */
                    const handle = (err, user, details) => {
                        if (err) {
                            res.statusCode = 500;
                            res.send(err.message);
                            return;
                        }
                        if (!user) {
                            // res.statusCode = 401;
                            // res.statusMessage = details.message;
                            // res.send(details);
                            sendNotAuthenticatedError(res, details.code, details.message)
                            return;
                        }
                        res.send({ 
                            access_token: createPublicAccessToken(user.uid, req.ip, user.access_token), 
                            user: getPublicAccountDetails(user)
                        });
                    };
                    if (details.method === 'token') {
                        return signIn(req, 'access_token', details.access_token, null, handle);
                    }
                    else if (details.method === 'email') {
                        return signIn(req, 'email', details.email, details.password, handle);
                    }
                    else {
                        return signIn(req, 'username', details.username, details.password, handle);
                    }
                });

                app.post(`/auth/${dbname}/signout`, (req, res) => {
                    // Remove access token from cache
                    if (!req.user) {
                        res.send('Bye!');
                        return;
                    }

                    // Remove token from cache
                    _authCache.delete(req.user.uid);

                    // Remove token from user's auth node
                    return authRef.child(req.user.uid)
                    .transaction(snap => {
                        if (!snap.exists()) { return; }

                        /** @type {AceBaseUserAccount} */
                        let user = snap.val();
                        user.access_token = null;
                        user.last_signout = new Date();
                        user.last_signout_ip = req.ip;
                        return user;
                    })
                    .then(() => {
                        authDb.ref('log').push({ action: 'signout', success: true, uid: req.user.uid, ip: req.ip, date: new Date() });
                        res.send('Bye!');
                    })
                    .catch(err => {
                        authDb.ref('log').push({ action: 'signout', success: false, code: 'unexpected', message: err.message, uid: req.user.uid, ip: req.ip, date: new Date() });
                        res.statusCode = 500;
                        res.send({ code: 'unexpected', message: err.message });
                    });
                });

                app.post(`/auth/${dbname}/change_password`, (req, res) => {
                    let access_token = req.user && req.user.access_token;
                    const details = req.body;

                    if (typeof details !== 'object' || typeof details.uid !== 'string' || typeof details.password !== 'string' || typeof details.new_password !== 'string') {
                        authDb.ref('log').push({ action: 'change_pwd', success: false, code: 'invalid_details', ip: req.ip, date: new Date() });
                        res.statusCode = 400; // Bad Request
                        res.send('Bad Request');
                        return;                    
                    }
                    if (details.new_password.length < 8 || ~details.new_password.indexOf(' ') || !/[0-9]/.test(details.new_password) || !/[a-z]/.test(details.new_password) || !/[A-Z]/.test(details.new_password)) {
                        authDb.ref('log').push({ action: 'change_pwd', success: false, code: 'new_password_denied', ip: req.ip, date: new Date(), uid: details.uid });
                        err = 'Invalid new password, must be at least 8 characters and contain a combination of numbers and letters (both lower and uppercase)';
                        res.statusCode = 422; // Unprocessable Entity
                        res.send(err);
                        return;
                    }

                    let publicAccessToken;
                    return authRef.child(details.uid)
                    .transaction(snap => {
                        if (!snap.exists()) {
                            let err = new Error(`Unknown uid`);
                            err.code = 'unknown_uid';
                            throw err;
                        }
                        /** @type {DbUserAccountDetails} */
                        let user = snap.val();
                        user.uid = snap.key;
                        let hash = user.password_salt ? getPasswordHash(details.password, user.password_salt) : getOldPasswordHash(details.password);
                        if (user.password !== hash) {
                            let err = new Error(`Wrong password`);
                            err.code = 'wrong_password';
                            throw err;
                        }
                        if (access_token && access_token !== user.access_token) {
                            let err = new Error(`Cannot change password while signed in as other user, or with an old token`);
                            err.code = 'wrong_access_token';
                            throw err;
                        }
                        let pwd = createPasswordHash(details.new_password);
                        const updates = {
                            access_token: ID.generate(),
                            access_token_created: new Date(),
                            password: pwd.hash,
                            password_salt: pwd.salt
                        };
                        // Update user object
                        Object.assign(user, updates);
                        // Set or update cache
                        _authCache.set(user.uid, user);
                        // Create new public access token
                        publicAccessToken = createPublicAccessToken(user.uid, req.ip, user.access_token);
                        
                        return user; // Update db
                    })
                    .then(userRef => {
                        res.send({ access_token: publicAccessToken }); // Client must use this new access token from now on
                    })
                    .catch(err => {
                        authDb.ref('log').push({ action: 'change_pwd', success: false, code: err.code, ip: req.ip, date: new Date(), uid: details.uid });
                        if (typeof err.code === 'string') {
                            res.statusCode = 400; // Bad Request
                            res.send({ code: err.code, message: err.message });
                        }
                        else {
                            res.statusCode = 500; // Internal server error
                            res.send({ code: 'unknown', message: 'server error', details: err.message });
                        }
                    });
                });

                const isValid = {
                    email(email) {
                        return /[a-z0-9_.+]+@([a-z0-9\-]+\.)+[a-z]{2,}/i.test(email);
                    },
                    username(username) {
                        return username !== 'admin' && typeof username === 'string' && username.length >= 5 && /^[a-z0-9]+$/.test(username);
                    },
                    displayName(displayName) {
                        return typeof displayName === 'string' && displayName.length >= 5;
                    },
                    password(password) {
                        return typeof password === 'string' && password.length >= 8 && password.indexOf(' ') < 0 && /[0-9]/.test(password) && /[a-z]/.test(password) && /[A-Z]/.test(password);
                    },
                    settings(settings) {
                        return typeof settings === 'undefined'
                             || (
                                 typeof settings === 'object' 
                                && Object.keys(settings).length <= 100 // max 100 settings
                                && Object.keys(settings).map(key => typeof settings[key]).every(t => ['string','number','boolean'].indexOf(t) >= 0) // only string, number, boolean values
                                && Object.keys(settings).filter(key => typeof settings[key] === 'string').every(key => settings[key].length <= 250) // strings values <= 250 chars
                            );
                    }
                };
                const validationErrors = {
                    email: { code: 'invalid_email', message: 'Invalid email address' },
                    username: { code: 'invalid_username', message: 'Invalid username, must be at least 5 characters and can only contain lowercase characters a-z and 0-9' },
                    displayName: { code: 'invalid_display_name', message: 'Invalid display_name, must be at least 5 characters' },
                    password: { code: 'invalid_password', message: 'Invalid password, must be at least 8 characters and contain a combination of numbers and letters (both lower and uppercase)' },
                    settings: { code: 'invalid_settings', message: 'Invalid settings, must be an object and contain only string, number and/or boolean values. Additionaly, string values can have a maximum length of 250, and a maximum of 100 settings can be added' }
                };

                app.post(`/auth/${dbname}/signup`, (req, res) => {
                    if (!this.config.authentication.allowUserSignup && (!req.user || req.user.username !== 'admin')) {
                        authDb.ref('log').push({ action: 'signup', success: false, code: 'user_signup_disabled', ip: req.ip, date: new Date() });
                        res.statusCode = 403; // Forbidden
                        return res.send({ code: 'admin_only', message: 'Only admin is allowed to create users' });
                    }

                    // Create user if it doesn't exist yet.
                    // TODO: Rate-limit nr of signups per IP to prevent abuse
                    
                    const details = req.body;

                    // Check if sent details are ok
                    let err;
                    if (!details.username && !details.email) {
                        err = { code: 'missing_details', message: 'No username or email provided' };
                    }
                    else if (details.email && !isValid.email(details.email)) {
                        err = validationErrors.email;
                    }
                    else if (details.username && !isValid.username) {
                        err = validationErrors.username;
                    }
                    else if (!isValid.displayName(details.displayName)) {
                        err = validationErrors.displayName;
                    }
                    else if (!isValid.password(details.password)) {
                        err = validationErrors.password;
                    }
                    else if (!isValid.settings(details.settings)) {
                        err = validationErrors.settings;
                    }
                    if (err) {
                        // Log failure
                        authDb.ref('log').push({ action: 'signup', success: false, code: err.code, ip: req.ip, date: new Date() });

                        res.statusCode = 422; // Unprocessable Entity
                        res.send(err);
                        return;
                    }

                    // Check if user(s) with username and/or email don't already exist
                    const promises = [];
                    if (details.username) {
                        let promise = authRef.query().filter('username', '==', details.username).get();
                        promises.push(promise);
                    }
                    if (details.email) {
                        let promise = authRef.query().filter('email', '==', details.email).get();
                        promises.push(promise);
                    }
                    return Promise.all(promises).then(arr => {
                        return arr.reduce((n, snaps) => n + snaps.length, 0);
                    })
                    .then(userCount => {
                        if (userCount > 0) {
                            authDb.ref('log').push({ action: 'signup', success: false, code: 'conflict', ip: req.ip, date: new Date(), username: details.username, email: details.email });
                            res.statusCode = 409; // conflict
                            res.send({ code: 'conflict', message: `Account with username and/or email already exists` });
                            return;
                        }

                        // Ok, create user
                        let pwd = createPasswordHash(details.password);
                        /** @type {DbUserAccountDetails} */
                        const user = {
                            username: details.username,
                            email: details.email,
                            display_name: details.displayName,
                            password: pwd.hash,
                            password_salt: pwd.salt,
                            created: new Date(),
                            created_ip: req.ip,
                            access_token: ID.generate(),
                            access_token_created: new Date(),
                            last_signin: new Date(),
                            last_signin_ip: req.ip,
                            settings: details.settings || {}
                        };

                        return authRef.push(user)
                        .then(ref => {
                            const uid = ref.key;
                            user.uid = uid;

                            // Log success
                            authDb.ref('log').push({ action: 'signup', success: true, ip: req.ip, date: new Date(), uid });

                            // Cache the user
                            _authCache.set(user.uid, user);

                            // Return the positive news
                            res.send({ 
                                access_token: createPublicAccessToken(user.uid, req.ip, user.access_token),
                                user: getPublicAccountDetails(user)
                            });
                        });
                    })
                    .catch(err => {
                        res.statusCode = 500;
                        res.send({ code: 'unexpected', message: err.message });
                    });
                });

                app.post(`/auth/${dbname}/update`, (req, res) => {
                    let details = req.body;

                    if (!req.user) {
                        authDb.ref('log').push({ action: 'update', success: false, code: 'unauthenticated_update', update_uid: details.uid, ip: req.ip, date: new Date() });
                        return sendNotAuthenticatedError(res, 'unauthenticated_update', 'Sign in to change details');
                    }

                    const uid = details.uid || req.user.uid;

                    if (req.user.uid !== 'admin' && (uid !== req.user.uid || typeof details.is_disabled === 'boolean')) {
                        authDb.ref('log').push({ action: 'update', success: false, code: 'unauthorized_update', auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });
                        return sendUnauthorizedError(res, 'unauthorized_update', 'You are not authorized to perform this update. This attempt has been logged.');
                    }

                    // Check if sent details are ok
                    let err;
                    if (details.email && !isValid.email(details.email)) {
                        err = validationErrors.email;
                    }
                    else if (details.username && !isValid.username) {
                        err = validationErrors.username;
                    }
                    else if (details.display_name && !isValid.displayName(details.display_name)) {
                        err = validationErrors.displayName;
                    }
                    else if (!isValid.settings(details.settings)) {
                        err = validationErrors.settings;
                    }
                    if (err) {
                        // Log failure
                        authDb.ref('log').push({ action: 'update', success: false, code: err.code, auth_uid: req.user.uid, update_uid: uid, ip: req.ip, date: new Date() });

                        res.statusCode = 422; // Unprocessable Entity
                        res.send(err);
                        return;
                    }

                    let user;
                    return authRef.child(uid)
                    .transaction(snap => {
                        if (!snap.exists()) {
                            const code = 'user_not_found';
                            authDb.ref('log').push({ action: 'update', success: false, code, auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });

                            res.statusCode = 404; // Not Found
                            res.send({ code, message: `No user found with uid ${uid}` });
                            return;
                        }
                        user = snap.val();
                        if (details.email) {
                            user.email = details.email; 
                            user.email_verified = true; // TODO: send verification email
                        }
                        if (details.username) { updates.username = details.username; }
                        if (details.display_name) { updates.display_name = details.display_name; }
                        if (details.settings) {
                            if (typeof user.settings !== 'object') {
                                user.settings = {};
                            }
                            Object.keys(details.settings).forEach(key => {
                                user.settings[key] = details.settings[key];
                            });
                            if (!isValid.settings(user.settings)) {
                                err = validationErrors.settings;
                                authDb.ref('log').push({ action: 'update', success: false, code: 'too_many_settings', auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });
                                res.statusCode = 422; // Unprocessable Entity
                                res.send(err);
                                return;        
                            }
                        }
                        if (typeof details.is_disabled === 'boolean') {
                            user.is_disabled = details.is_disabled;
                        }

                        return user; // Update db user
                    })
                    .then(() => {
                        // Update cache
                        _authCache.set(user.uid, user);
                        // Send merged results back
                        res.send({ user: getPublicAccountDetails(user) });
                    })
                    .catch(err => {
                        authDb.ref('log').push({ action: 'update', success: false, code: 'unexpected', message: err.message, auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });
                        res.statusCode = 500;
                        res.send({ code: 'unexpected', message: err.message });
                    });                    ;
                });

                app.post(`/auth/${dbname}/delete`, (req, res) => {
                    let details = req.body;

                    if (!req.user) {
                        authDb.ref('log').push({ action: 'delete', success: false, code: 'unauthenticated_delete', delete_uid: details.uid, ip: req.ip, date: new Date() });
                        return sendNotAuthenticatedError(res, 'unauthenticated_delete', 'You are not authorized to perform this operation, your attempt has been logged');
                    }

                    if (req.user.uid !== 'admin' && (details.uid !== req.user.uid || typeof details.is_disabled === 'boolean')) {
                        authDb.ref('log').push({ action: 'delete', success: false, code: 'unauthorized_delete', auth_uid: req.user.uid, delete_uid: details.uid, ip: req.ip, date: new Date() });
                        return sendUnauthorizedError(res, 'unauthorized_update', 'You are not authorized to perform this operation, your attempt has been logged');
                    }

                    const uid = details.uid || req.user.uid;
                    return authRef.child(uid)
                    .remove()
                    .then(() => {
                        authDb.ref('log').push({ action: 'delete', success: true, auth_uid: req.user.uid, delete_uid: details.uid, ip: req.ip, date: new Date() });
                        res.send('Farewell');
                    })
                    .catch(err => {
                        authDb.ref('log').push({ action: 'delete', success: false, code: 'unexpected', auth_uid: req.user.uid, delete_uid: details.uid, ip: req.ip, date: new Date() });
                        res.statusCode = 500;
                        res.send({ code: 'unexpected', message: err.message });
                    })
                });
            }

            const webManagerDir = `/webmanager/`;
            app.get('/', (req, res) => {
                res.redirect(webManagerDir);
            });

            app.get(`${webManagerDir}*`, (req, res) => {
                const filePath = req.path.slice(webManagerDir.length);
                if (filePath.length === 0) {
                    // Send default file
                    res.sendFile(__dirname + '/webmanager/index.html');
                }
                // else if (filePath === 'TEST') {
                //     // apply test
                //     let test;
                //     if (req.query.type === 'update') {
                //         let val = req.query.val;
                //         if (val[0] === '{') { val = JSON.parse(val); }
                //         test = db.ref(req.query.path || '').update(val);
                //     }
                //     else {
                //         res.send('');
                //     }
                //     return test && test.then(() => {
                //         res.send('ok');
                //     })
                //     .catch(err => { 
                //         res.send('fail: ' + err.message);
                //     });
                // }
                else {
                    res.sendFile(__dirname + '/webmanager/' + filePath);
                }
            });

            app.get("/info", (req, res) => {
                let obj = {
                    time: new Date(), 
                    process: process.pid,
                    dbname: dbname
                }
                // for (let i = 0; i < 1000000000; i++) {
                //     let j = Math.pow(i, 2);
                // }
                res.send(obj);
            });

            app.get(`/data/${dbname}/*`, (req, res) => {
                // Request data
                const path = req.path.substr(dbname.length + 7); //.replace(/^\/+/g, '').replace(/\/+$/g, '');
                if (!userHasAccess(req.user, path, false, denyDetails => sendUnauthorizedError(res, denyDetails.code, denyDetails.message))) {
                    return;
                }

                const options = {};
                if (req.query.include) {
                    options.include = req.query.include.split(',');
                }
                if (req.query.exclude) {
                    options.exclude = req.query.exclude.split(',');
                }
                if (typeof req.query.child_objects === "boolean") {
                    options.child_objects = req.query.child_objects;
                }

                // if (path === '') {
                //     // Prevent access to private "__auth__" node
                //     if (options.include instanceof Array && ~options.include.indexOf('__auth__')) {
                //         options.include.splice(options.include.indexOf('__auth__'), 1);
                //     }
                //     if (!(options.exclude instanceof Array)) { options.exclude = []; }
                //     options.exclude.push('__auth__');
                // }
                // else if (path.startsWith('__auth__')) {
                //     return sendUnauthorizedError(res, 'get lost!');
                // }

                db.ref(path)
                .get(options) //.once("value")
                .then(snap => {
                    const ser = Transport.serialize(snap.val());
                    const data = {
                        exists: snap.exists(),
                        val: ser.val,
                        map: ser.map
                    }         
                    res.send(data);
                })
                .catch(err => {
                    res.statusCode = 500;
                    res.send(err);
                });
            });

            app.get(`/reflect/${dbname}/*`, (req, res) => {
                // Reflection API
                if (!req.user || req.user.username !== 'admin') {
                    return sendUnauthorizedError(res, 'admin_only', 'only admin can use reflection api');
                }
                const path = req.path.substr(dbname.length + 10);
                const impersonatedAccess = {
                    uid: req.query.impersonate,
                    read: {
                        allow: false,
                        error: null
                    },
                    write: {
                        allow: false,
                        error: null
                    }
                }
                const impersonatedUser = impersonatedAccess.uid === 'anonymous' ? null : { uid: impersonatedAccess.uid };
                if (impersonatedAccess.uid) {
                    impersonatedAccess.read.allow = userHasAccess(impersonatedUser, path, false, denyDetails => { 
                        impersonatedAccess.read.error = { code: denyDetails.code, message: denyDetails.message };
                    });
                    impersonatedAccess.write.allow = userHasAccess(impersonatedUser, path, true, denyDetails => { 
                        impersonatedAccess.write.error = { code: denyDetails.code, message: denyDetails.message };
                    });
                }
                const type = req.query.type;
                const args = {};
                Object.keys(req.query).forEach(key => {
                    if (!['type','impersonate'].includes(key)) {
                        args[key] = req.query[key];
                    }
                });

                db.ref(path)
                .reflect(type, args)
                .then(result => {
                    if (impersonatedAccess.uid) {
                        result.impersonation = impersonatedAccess;
                        let list;
                        if (type === 'children') {
                            list = result.list;
                        }
                        else if (type === 'info') {
                            list = typeof result.children === 'object' ? result.children.list : [];
                        }
                        list && list.forEach(childInfo => {
                            childInfo.access = {
                                read: userHasAccess(impersonatedUser, PathInfo.getChildPath(path, childInfo.key), false),
                                write: userHasAccess(impersonatedUser, PathInfo.getChildPath(path, childInfo.key), true)
                            };
                        });
                    }
                    res.send(result);
                })
                .catch(err => {
                    res.statusCode = 500;
                    res.send(err);
                });
            });

            app.get(`/export/${dbname}/*`, (req, res) => {
                // Export API
                if (!req.user || req.user.username !== 'admin') {
                    return sendUnauthorizedError(res, 'admin_only', 'only admin can use export api');
                }
                const path = req.path.substr(dbname.length + 9);
                const format = req.query.format || 'json';

                const stream = {
                    write(chunk) {
                        return new Promise((resolve, reject) => {
                            res.write(chunk, err => {
                                if (err) { reject(err); }
                                else { resolve(); }
                            });
                        });
                    }
                };
                db.ref(path)
                .export(stream, { format })
                .then(() => {
                    res.end();
                })
                .catch(err => {
                    res.statusCode = 500;
                    res.send(err);
                });                
            });

            app.get(`/exists/${dbname}/*`, (req, res) => {
                // Exists query
                const path = req.path.substr(dbname.length + 9);
                if (!userHasAccess(req.user, path, false, denyDetails => sendUnauthorizedError(res, denyDetails.code, denyDetails.message))) {
                    return;
                }

                db.ref(path)
                .exists()
                .then(exists => {
                    res.send({ exists });
                })
                .catch(err => {
                    res.statusCode = 500;
                    res.send(err);
                });
            });

            app.get(`/stats/${dbname}`, (req, res) => {
                // Get database stats
                db.api.stats()
                .then(stats => {
                    res.send(stats);
                })
                .catch(err => {
                    res.statusCode = 500;
                    res.send(err);
                });
            });
            
            app.post(`/data/${dbname}/*`, (req, res) => {
                // update data                
                const path = req.path.substr(dbname.length + 7);
                if (!userHasAccess(req.user, path, true, denyDetails => sendUnauthorizedError(res, denyDetails.code, denyDetails.message))) {
                    return;
                }

                const data = req.body;
                const val = Transport.deserialize(data);

                db.ref(path)
                .update(val)
                .then(ref => {
                    res.send({
                        success: true
                    });
                })
                .catch(err => {
                    console.error(err);
                    res.statusCode = 500;
                    res.send(err);
                });
            });

            app.put(`/data/${dbname}/*`, (req, res) => {
                // Set data
                const path = req.path.substr(dbname.length + 7);
                if (!userHasAccess(req.user, path, true, denyDetails => sendUnauthorizedError(res, denyDetails.code, denyDetails.message))) {
                    return;
                }

                const data = req.body;
                const val = Transport.deserialize(data);

                db.ref(path)
                .set(val)
                .then(ref => {
                    res.send({
                        success: true
                    });
                })
                .catch(err => {
                    console.error(err);
                    res.statusCode = 500;
                    res.send(err);
                });
            });

            app.post(`/query/${dbname}/*`, (req, res) => {
                // Execute query
                const path = req.path.substr(dbname.length + 8);
                if (!userHasAccess(req.user, path, false, denyDetails => sendUnauthorizedError(res, denyDetails.code, denyDetails.message))) {
                    return;
                }

                const data = Transport.deserialize(req.body);
                //const ref = db.ref(path);
                const query = db.query(path);
                data.query.filters.forEach(filter => {
                    query.where(filter.key, filter.op, filter.compare);
                });
                data.query.order.forEach(order => {
                    query.order(order.key, order.ascending);
                });
                if (data.query.skip > 0) {
                    query.skip(data.query.skip);
                }
                if (data.query.take > 0) {
                    query.take(data.query.take);
                }
                query.get(data.options).then(results => {
                    const response = {
                        count: results.length,
                        list: []
                    };
                    results.forEach(result => {
                        if (data.options.snapshots) {
                            response.list.push({ path: result.ref.path, val: result.val() });
                        }
                        else {
                            response.list.push(result.path);
                        }
                    });
                    res.send(Transport.serialize(response));
                });
            });

            app.get(`/index/${dbname}`, (req, res) => {
                // Get all indexes
                db.indexes.get()
                .then(indexes => {
                    res.send(indexes);
                });
            });

            app.post(`/index/${dbname}`, (req, res) => {
                // create index
                if (!req.user || req.user.username !== 'admin') {
                    return sendUnauthorizedError(res, 'admin_only', 'only admin can create indexes');
                }

                const data = req.body;
                if (data.action === "create") {
                    db.indexes.create(data.path, data.key, data.options)
                    .then(() => {
                        res.send({ success: true });
                    })
                    .catch(err => {
                        console.error(err);
                        res.statusCode = 500;
                        res.send(err);         
                    })
                }
            });

            const _transactions = new Map();
            app.post(`/transaction/${dbname}/start`, (req, res) => {
                const data = req.body;

                if (!userHasAccess(req.user, data.path, true, denyDetails => sendUnauthorizedError(res, denyDetails.code, denyDetails.message))) {
                    return;
                }

                // Start transaction
                const tx = {
                    id: ID.generate(),
                    started: Date.now(),
                    path: data.path,
                    finish: undefined
                };
                _transactions.set(tx.id, tx);

                console.log(`Transaction ${tx.id} starting...`);
                // const ref = db.ref(tx.path);
                const donePromise = db.api.transaction(tx.path, val => {
                    console.log(`Transaction ${tx.id} started with value: `, val);
                    const currentValue = Transport.serialize(val);
                    const promise = new Promise((resolve) => {
                        tx.finish = (val) => {
                            console.log(`Transaction ${tx.id} finishing with value: `, val);
                            resolve(val);
                            return donePromise;
                        };
                    });
                    res.send({ id: tx.id, value: currentValue });
                    return promise;
                });
            });

            app.post(`/transaction/${dbname}/finish`, (req, res) => {
                const data = req.body;

                const tx = _transactions.get(data.id);
                if (!tx) {
                    res.statusCode = 410; // Gone
                    res.send(`transaction not found`);
                    return;
                }
                _transactions.delete(data.id);

                if (!userHasAccess(req.user, data.path, true, denyDetails => sendUnauthorizedError(res, denyDetails.code, denyDetails.message))) {
                    return;
                }

                // Finish transaction
                const newValue = Transport.deserialize(data.value);
                tx.finish(newValue)
                .then(() => {
                    res.send('done');
                })
                .catch(err => {
                    res.statusCode = 500;
                    res.send(err.message);
                });
            });

            server.listen(this.config.port, this.config.hostname, () => {
                console.log(`"${dbname}" database server running at ${this.config.url}`);
                this._ready === true;
                this.emit(`ready`);
            });

            // Websocket implementation:
            const clients = {
                list: [],
                get(id) {
                    return this.list.find(client => client.id === id);
                },
                add(id) {
                    const client = {
                        id,
                        subscriptions: {},
                        transactions: {},
                        user: null
                    };
                    this.list.push(client);
                    return client;
                },
                /**
                 * @param {string|object} client | client id or object 
                 */
                remove(client) {
                    let index = -1;
                    if (typeof client === "object") {
                        index = this.list.indexOf(client);
                    }
                    else {
                        index = this.list.findIndex(c => c.id === client);
                    }
                    if (index >= 0) {
                        this.list.splice(index, 1);
                    }
                }
            };

            /** @type {Map<string, Client} */
            const clientsNew = new Map();

            io.sockets.on("connection", socket => {
                clients.add(socket.id);
                console.log(`New client connected, total: ${clients.list.length}`);
                //socket.emit("welcome");

                socket.on("disconnect", data => {
                    // We lost one
                    const client = clients.get(socket.id);
                    if (!client) { return; } // Disconnected a client we did not know? Don't crash, just ignore.
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

                        let remove = [];
                        subscribedPaths.forEach(path => {
                            remove.push(...client.subscriptions[path]);
                        });
                        remove.forEach(subscr => {
                            // Unsubscribe them at db level and remove from our list
                            db.api.unsubscribe(subscr.path, subscr.event, subscr.callback); //db.ref(subscr.path).off(subscr.event, subscr.callback);
                            let pathSubs = client.subscriptions[subscr.path];
                            pathSubs.splice(pathSubs.indexOf(subscr), 1);
                        });
                    }
                    clients.remove(client);
                    console.log(`Socket disconnected, total: ${clients.list.length}`);
                });

                socket.on("reconnect", data => {
                    let prevSocketId = data.id;
                    // TODO: implement cached notification sending
                })

                socket.on("signin", accessToken => {
                    const client = clients.get(socket.id);
                    let uid;
                    try {
                        uid = decodePublicAccessToken(accessToken).uid;
                        client.user = _authCache.get(uid) || null;
                    }
                    catch(err) {
                        // no way to bind the user
                        console.error(`websocket: invalid access token passed to signin: ${accessToken}`);
                    }
                });

                socket.on("signout", data => {
                    const client = clients.get(socket.id);
                    client.user = null;
                });

                socket.on("subscribe", data => {
                    // Client wants to subscribe to events on a node
                    const subscriptionPath = data.path;

                    // Get client
                    const client = clients.get(socket.id);

                    if (!userHasAccess(client.user, subscriptionPath, false)) {
                        authDb.ref('log').push({ action: `access_denied`, uid: client.user ? client.user.uid : '-', path: subscriptionPath });
                        socket.emit('result', {
                            success: false,
                            reason: `access_denied`,
                            req_id: data.req_id
                        });
                        return;
                    }

                    const callback = (err, path, currentValue, previousValue) => {
                        if (!userHasAccess(client.user, path, false)) {
                            if (subscriptionPath.indexOf('*') < 0 && subscriptionPath.indexOf('$') < 0) {
                                // Could potentially be very many callbacks, so
                                // DISABLED: authDb.ref('log').push({ action: `access_revoked`, uid: client.user ? client.user.uid : '-', path: subscriptionPath });
                                // Only log when user subscribes again
                                socket.emit('result', {
                                    success: false,
                                    reason: `access_denied`,
                                    req_id: data.req_id
                                });
                            }
                            return;
                        }
                        if (err) {
                            return;
                        }
                        let val = Transport.serialize({
                            current: currentValue,
                            previous: previousValue
                        });
                        console.log(`Sending data event "${data.event}" for path "/${path}" to client ${socket.id}`);
                        socket.emit("data-event", {
                            subscr_path: subscriptionPath,
                            path,
                            event: data.event,
                            val
                        });
                    };
                    console.log(`Client ${socket.id} subscribes to event "${data.event}" on path "/${data.path}"`);
                    // const client = clients.get(socket.id);

                    let pathSubs = client.subscriptions[subscriptionPath];
                    if (!pathSubs) { pathSubs = client.subscriptions[subscriptionPath] = []; }

                    let subscr = { path: subscriptionPath, event: data.event, callback };
                    pathSubs.push(subscr);

                    db.api.subscribe(subscriptionPath, data.event, callback);

                    // Send acknowledgement
                    socket.emit('result', {
                        success: true,
                        req_id: data.req_id
                    });
                    // })
                    // .catch(err => {
                    //     // Not authorized
                    //     // Let client know
                    //     socket.emit('error', {
                    //         reason: err instanceof AccessDeniedError ? err.message : 'internal_error',
                    //         req_id: data.req_id
                    //     });
                    // });                    
                });

                socket.on("unsubscribe", data => {
                    // Client unsubscribes from events on a node
                    console.log(`Client ${socket.id} is unsubscribing from event "${data.event || '(any)'}" on path "/${data.path}"`);
                    
                    const client = clients.get(socket.id);
                    let pathSubs = client.subscriptions[data.path];
                    if (!pathSubs) {
                        return; // We have no knowledge of any active subscriptions on this path
                    }
                    let remove = pathSubs;
                    if (data.event) {
                        // Unsubscribe from a specific event
                        remove = pathSubs.filter(subscr => subscr.event === data.event);
                    }
                    remove.forEach(subscr => {
                        // Unsubscribe them at db level and remove from our list
                        //console.log(`   - unsubscribing from event ${subscr.event} with${subscr.callback ? "" : "out"} callback on path "${data.path}"`);
                        db.api.unsubscribe(subscr.path, subscr.event, subscr.callback); //db.api.unsubscribe(data.path, subscr.event, subscr.callback);
                        pathSubs.splice(pathSubs.indexOf(subscr), 1);
                    });
                    if (pathSubs.length === 0) {
                        // No subscriptions left on this path, remove the path entry
                        delete client.subscriptions[data.path];
                    }
                });

                socket.on("transaction", data => {
                    console.log(`Client ${socket.id} is sending ${data.action} transaction request on path "${data.path}"`);
                    const client = clients.get(socket.id);

                    if (data.action === "start") {
                        const tx = {
                            id: data.id,
                            started: Date.now(),
                            path: data.path,
                            finish: undefined
                        };

                        if (!userHasAccess(client.user, data.path, true)) {
                            // throw new AccessDeniedError(`access_denied`);
                            socket.emit("tx_error", { id: tx.id, reason: 'access_denied' }); // what if message is dropped? We should implement an ack/retry mechanism
                        }

                        // Start a transaction
                        client.transactions[data.id] = tx;
                        console.log(`Transaction ${tx.id} starting...`);
                        // const ref = db.ref(tx.path);
                        const donePromise = db.api.transaction(tx.path, val => {
                            console.log(`Transaction ${tx.id} started with value: `, val);
                            const currentValue = Transport.serialize(val);
                            const promise = new Promise((resolve) => {
                                tx.finish = (val) => {
                                    console.log(`Transaction ${tx.id} finishing with value: `, val);
                                    resolve(val);
                                    return donePromise;
                                };
                            });
                            socket.emit("tx_started", { id: tx.id, value: currentValue }); // what if message is dropped? We should implement an ack/retry mechanism
                            return promise;
                        });
                    }

                    if (data.action === "finish") {
                        // Finish transaction
                        // TODO: check what happens if undefined is returned
                        const tx = client.transactions[data.id];
                        delete client.transactions[data.id];

                        try {
                            if (!tx) {
                                throw new Error('transaction_not_found'); 
                            }
                            if (!userHasAccess(client.user, data.path, true)) {
                                throw new Error('access_denied');
                            }
                            const newValue = Transport.deserialize(data.value);
                            tx.finish(newValue)
                            .then(res => {
                                console.log(`Transaction ${tx.id} finished`);
                                socket.emit("tx_completed", { id: tx.id });
                            })
                            .catch(err => {
                                socket.emit("tx_error", { id: tx.id, reason: err.message });
                            });
                        }
                        catch (err) {
                            tx.finish(); // Finish with undefined, canceling the transaction
                            socket.emit('tx_error', {
                                id: data.id,
                                reason: err.message,
                                data
                            });
                        }
                    }

                });

            });
        });
    }

    /**
     * 
     * @param {()=>void} [callback] (optional) callback function that is called when ready. You can also use the returned promise
     * @returns {Promise<void>} returns a promise that resolves when ready
     */
    ready(callback = undefined) {
        if (this._ready === true) { 
            // ready event was emitted before
            callback && callback();
            return Promise.resolve();
        }
        else {
            // Wait for ready event
            let resolve;
            const promise = new Promise(res => resolve = res);
            this.on("ready", () => {
                resolve();
                callback && callback(); 
            });
            return promise;
        }
    }
}

if (__filename.replace(/\\/g,"/").endsWith("/acebase-server.js") && process.argv[2] === "start") {
    // If one executed "node server.js start [hostname] [port]"
    const dbname = process.argv[3] || "default";
    const options = { host: process.argv[4], port: process.argv[5] };
    const server = new AceBaseServer(dbname, options);
    server.once("ready", () => {
        console.log(`AceBase server running`);
    });
}

module.exports = { AceBaseServer, AceBaseServerSettings, AceBaseClusterSettings };