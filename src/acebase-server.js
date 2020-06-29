
const { EventEmitter } = require('events');
const { AceBase, AceBaseSettings } = require('acebase');
const { ID, Transport, DataSnapshot, PathInfo, Utils, DebugLogger } = require('acebase-core');
const { TypeChecker } = require('./typecheck');
const fs = require('fs');
const crypto = require('crypto');
require('colors'); // Make sure we can use colors for log output

class AceBaseClusterSettings {
    constructor(settings) {
        this.enabled = typeof settings === "object";
        this.isMaster = this.enabled && settings.isMaster;
        this.master = this.enabled ? settings.master : process;
        this.workers = this.enabled ? settings.workers : [process];
    }
}

// class AceBaseClusterSettings {
//     constructor(settings) {
//         this.enabled = typeof settings === "object";
//         this.port = this.enabled ? settings.port : 0;
//     }
// }

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
     * @param {object} settings 
     * @param {boolean} [settings.enabled=true] if authorization is enabled, without authorization the entire db can be read and written to by anyone
     * @param {boolean} [settings.allowUserSignup=false] If new users creation is allowed for anyone, or just the admin
     * @param {number} [settings.newUserRateLimit=0] how many new users per hour per IP address. not implemented yet
     * @param {number} [settings.tokensExpire=0] how many minutes before access tokens expire. 0 for no expiration. not implemented yet
     * @param {string} [settings.defaultAccessRule='auth'] when the server runs for the first time, what defaults to use to generate the rules.json file with. Options are: 'auth' (only authenticated access to db, default), 'deny' (deny access to anyone except admin user), 'allow' (allow access to anyone)
     * @param {boolean} [settings.defaultAdminPassword] when the server runs for the first time, what password to use for the admin user. If not supplied, a generated password will be used and shown ONCE in the console output.
     * @param {boolean} [settings.seperateDb=false] whether to use a seperate database for auth and logging
     */
    constructor(settings) {
        if (typeof settings !== "object") { settings = {}; }
        this.enabled = typeof settings.enabled === 'boolean' ? settings.enabled : true;
        this.allowUserSignup = typeof settings.allowUserSignup === 'boolean' ? settings.allowUserSignup : false;
        this.newUserRateLimit = typeof settings.newUserRateLimit === 'number' ? settings.newUserRateLimit : 0;
        this.tokensExpire = typeof settings.tokensExpire === 'number' ? settings.tokensExpire : 0;
        this.defaultAccessRule = settings.defaultAccessRule || AceBaseServerAuthenticationSettings.ACCESS_DEFAULT.ALLOW_AUTHENTICATED;
        this.defaultAdminPassword = typeof settings.defaultAdminPassword === 'string' ? settings.defaultAdminPassword : undefined;
        this.seperateDb = typeof settings.seperateDb === 'boolean' ? settings.seperateDb : false;
    }

    static get ACCESS_DEFAULT() {
        return {
            DENY_ALL: 'deny',
            ALLOW_ALL: 'allow',
            ALLOW_AUTHENTICATED: 'auth'
        }
    }
}

class AceBaseServerEmailServerSettings {
    /**
     * 
     * @param {object} settings 
     * @param {string} settings.host
     * @param {number} settings.port
     * @param {string} [settings.username]
     * @param {string} [settings.password]
     * @param {boolean} [settings.secure]
     * @
     */
    constructor(settings) {
        this.host = settings.host;
        this.port = settings.port;
        this.secure = settings.secure;
        this.username = settings.username;
        this.password = settings.password;
    }
}

class AceBaseEmailRequest {
    /**
     * 
     * @param {string} type email request type
     */
    constructor(type) {
        this.type = type;
    }
}

class AceBaseUserEmailRequest extends AceBaseEmailRequest {
    /**
     * @param {string} type
     * @param {object} data 
     * @param {object} data.user
     * @param {string} data.user.uid
     * @param {string} data.user.email
     * @param {string} data.user.username
     * @param {string} data.user.displayName
     * @param {any} data.user.settings
     * @param {string} data.ip
     * @param {Date} data.date
     */
    constructor(type, data) {
        super(type);
        this.user = data.user;
        this.ip = data.ip;
        this.date = data.date;
    }
}

class AceBaseUserSignupEmailRequest extends AceBaseUserEmailRequest {
    /**
     * 
     * @param {AceBaseUserEmailRequest & { provider: string, activationCode: string, emailVerified: boolean }} data
     */
    constructor(data) {
        super('user_signup', data);
        this.activationCode = data.activationCode;
        this.emailVerified = data.emailVerified;
        this.provider = data.provider;
    }
}

class AceBaseUserSignInEmailRequest extends AceBaseUserEmailRequest {
    /**
     * 
     * @param {AceBaseUserEmailRequest & { provider: string, activationCode: string, emailVerified: boolean }} data
     */
    constructor(data) {
        super('user_signin', data);
        this.activationCode = data.activationCode;
        this.emailVerified = data.emailVerified;
        this.provider = data.provider;
    }
}

class AceBaseUserResetPasswordEmailRequest extends AceBaseUserEmailRequest {
    /**
     * @param {AceBaseUserEmailRequest & { resetCode: string }} data
     */
    constructor(data) {
        super('user_reset_password', data);
        this.resetCode = data.resetCode;
    }
}

class AceBaseUserResetPasswordSuccessEmailRequest extends AceBaseUserEmailRequest{
    /**
     * @param {AceBaseUserResetPasswordSuccessEmailRequest} data
     */
    constructor(data) {
        super('user_reset_password_success', data);
    }
}

class AceBaseServerEmailSettings {
    /**
     * 
     * @param {object} settings 
     * @param {AceBaseServerEmailServerSettings} [settings.server] NOT IMPLEMENTED YET - Use send property for your own implementation
     * @param {(request: AceBaseEmailRequest) => Promise<boolean>} [settings.send] Callback function to call when an e-mail needs to be sent
     * 
     */
    constructor(settings) {
        this.server = settings.server;
        this.send = settings.send;
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
     * @param {AceBaseServerEmailSettings} [settings.email]
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
        this.email = typeof settings.email === 'object' ? new AceBaseServerEmailSettings(settings.email) : null;
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
    /**
     * Not used - yet
     * @param {object} obj 
     * @param {AceBaseServer} obj.server
     * @param {SocketIO.Socket} obj.socket
     * @param {DbUserAccountDetails} obj.user
     */
    constructor(obj) {
        this.server = obj.server;
        this.socket = obj.socket;
        this.id = this.socket.id;
        this.user = obj.user;

        /** @type {{ [path: string]: ClientSubscription }} */
        this.subscriptions = {};
        /** @type {MissedClientEvent[]} */
        this.missedEvents = [];
    }

    subscribe(requestId, event, subscriptionPath) {
        // Check if user has access
        if (!this.server.userHasAccess(this.user, subscriptionPath, false)) {
            logRef.push({ action: `subscribe`, success: false, code: `access_denied`, uid: this.user ? this.user.uid : '-', path: subscriptionPath });
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
            if (!this.server.userHasAccess(this.user, path, false)) {
                if (subscriptionPath.indexOf('*') < 0 && subscriptionPath.indexOf('$') < 0) {
                    // Could potentially be very many callbacks, so
                    // DISABLED: logRef.push({ action: `access_revoked`, uid: client.user ? client.user.uid : '-', path: subscriptionPath });
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
            this.server.verbose(`Sending data event "${event}" for path "/${path}" to client ${this.id}`);
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
 * @property {string} [email_verification_code] Code that enables the user to verify their email address with
 * @property {boolean} [is_disabled] if the account has been disabled
 * @property {string} [display_name]
 * @property {object} [picture]
 * @property {string} picture.url
 * @property {number} picture.width
 * @property {number} picture.height
 * @property {string} password password hash
 * @property {string} password_salt random password salt used to secure password hash
 * @property {string} [password_reset_code] Code that allows a user to reset their password with
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
        picture: account.picture,
        emailVerified: account.email_verified,
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

function createPublicToken(data) {
    // TODO: Use encryption
    // let obj = {
    //     uid: uid,
    //     email: email,
    //     code: ID.generate()
    // };
    let str = JSON.stringify(data);
    str = Buffer.from(str).toString('base64');
    return 'a' + str; // version a
}

function decodePublicToken(code) {
    if (!code || code[0] !== 'a') { return {}; }
    try {
        let str = code.slice(1);
        str = Buffer.from(str, 'base64').toString();
        let obj = JSON.parse(str);
        return obj;
    }
    catch(err) {
        return {};
    }
}

function createVerificationCode(uid, email) {
    return createPublicToken({
        uid,
        email,
        code: ID.generate()
    });
}
function decodeVerificationCode(code) {
    let details = decodePublicToken(code);
    return {
        uid: details.uid,
        email: details.email,
        code: details.code
    };
}
function createPasswordResetCode(uid, email) {
    return createPublicToken({
        uid,
        email,
        code: ID.generate()
    });    
}
function decodePasswordResetCode(code) {
    let details = decodePublicToken(code);
    return {
        uid: details.uid,
        email: details.email,
        code: details.code
    };    
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
        app.set('trust proxy', true); // When behind proxy server, req.ip and req.hostname will be set the right way
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
            authentication: options.authentication,
            email: options.email
        };
        this.url = this.config.url; // Is this used?
        this.debug = new DebugLogger(options.logLevel, `[${dbname}]`.green); //`« ${dbname} »`
        
        const dbOptions = {
            logLevel: options.logLevel,
            storage: {
                cluster: options.cluster,
                path: options.path,
                info: 'realtime database server',
                removeVoidProperties: true
            }
        };

        const db = new AceBase(dbname, dbOptions);

        if (options.authentication.enabled) {
            this.authProviders = {};
        }
        if (options.authentication.enabled && !options.https.enabled) {
            this.debug.warn(`WARNING: Authentication is enabled, but the server is not using https. Any password and other data transmitted may be intercepted!`.red);
        }
        else if (!options.https.enabled) {
            this.debug.warn(`WARNING: Server is not using https, any data transmitted may be intercepted!`.red);
        }
        if (!options.authentication.enabled) {
            this.debug.warn(`WARNING: Authentication is disabled, *anyone* can do *anything* with your data!`.red);
        }

        const otherDbsPath = `${options.path}/${dbname}.acebase`;
        // const eventsDb = new AceBase('events', { logLevel: dbOptions.logLevel,  storage: { path: otherDbsPath, removeVoidProperties: true } })
        // const logsDb = new AceBase('logs', { logLevel: dbOptions.logLevel,  storage: { path: otherDbsPath, removeVoidProperties: true } })
        const authDb = options.authentication.enabled
            ? 
                options.authentication.seperateDb === true // NEW
                    ? new AceBase('auth', { logLevel: dbOptions.logLevel, storage: { path: otherDbsPath, removeVoidProperties: true, info: `${dbname} auth database` } })
                    : db
            : null;

        // To handle unhandled promise rejections so process will not die in future versions of node:
        // process.on("unhandledRejection", (reason, p) => {
        //     this.debug.error("Unhandled promise rejection at: ", reason.stack);
        // });

        const generatePassword = () => {
            return Array.prototype.reduce.call('abcedefghijkmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ012345789!@#$%&', (password, c, i, chars) => {
                if (i > 15) { return password; }
                return password + chars[Math.floor(Math.random() * chars.length)];
            }, '');
        };

        const createPasswordHash = (password) => {
            let length = 16;
            let salt = crypto.randomBytes(Math.ceil(length/2)).toString('hex').slice(0,length);
            let hash = crypto.createHmac('sha512', salt).update(password).digest('hex');
            return {
                salt,
                hash
            }
        };
        const getOldPasswordHash = (password) => {
            // Backward compatibility with old saltless md5 passwords. 
            // Becomes obsolete once all passwords have been updated
            return crypto.createHash('md5').update(password).digest('hex');
        };
        const getPasswordHash = (password, salt) => {
            return crypto.createHmac('sha512', salt).update(password).digest('hex');
        };

        const readyPromises = [
            db.ready(),
            authDb && authDb !== db ? authDb.ready() : null
        ];
        
        Promise.all(readyPromises)
        .then(() => {
            //this.debug.log(`Database "${dbname}" is ready to use`);

            let accessRules = {};
            const authRef = authDb ? authDb === db ? db.ref('__auth__/accounts') : authDb.ref('accounts') : null;
            const logRef = authDb ? authDb === db ? db.ref('__log__') : authDb.ref('log') : null;

            const setupRules = () => {
                // Check if there is a rules file, load it or generate default
                const rulesFilePath = `${options.path}/${dbname}.acebase/rules.json`;

                fs.unwatchFile(rulesFilePath); // If function was triggered because of file change, stop listening now. Listener will be setup again at end of function

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
                            this.debug.error(`Unknown defaultAccessRule "${def}"`);
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
                        this.debug.error(`Failed to read rules from "${rulesFilePath}": ${err.message}`);
                        accessRules = defaultRules;
                    }
                }

                // Convert string rules to functions that can be executed
                const processRules = (path, parent, variables) => {
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
                        else if (key === '.schema') {
                            // Parse "typescript" schema
                            const text = rule;
                            /** @@type {TypeChecker} */
                            let checker;
                            try {
                                checker = new TypeChecker(rule);
                            }
                            catch(err) {
                                this.debug.error(`Error parsing ${path}/.schema: ${err.message}`)
                            }
                            rule = (value, partial) => {
                                const result = checker.check(path, value, partial);
                                return result;
                            };
                            rule.getText = () => {
                                return text;
                            };
                            parent[key] = rule;
                        }
                        else if (key.startsWith('$')) {
                            variables.push(key);
                        }
                        if (typeof rule === 'object') {
                            processRules(`${path}/${key}`, rule, variables.slice());
                        }
                    });
                };
                processRules('', accessRules.rules, []);

                // Watch file for changes
                fs.watchFile(rulesFilePath, (currStats, prevStats) => {
                    // rules.json file changed, setup rules again
                    setupRules();
                })
            }
            setupRules();

            if (options.authentication.enabled) {
                // NEW: Make sure there is an administrator account in the database
                // NOTE: the admin account is the only account with a non-generated uid: 'admin'
                authRef.child('admin').transaction(snap => {

                    /** @type {DbUserAccountDetails} */
                    let adminAccount = snap.val();
                    if (!snap.exists()) {
                        // Use provided default password, or generate one:
                        const adminPassword = options.authentication.defaultAdminPassword || generatePassword();

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
                        this.debug.warn(`__________________________________________________________________`.red);
                        this.debug.warn(``.red);
                        this.debug.warn(`IMPORTANT: Admin account created`.red);
                        this.debug.warn(`You need the admin account to remotely administer the database`.red);
                        this.debug.warn(`Use the following credentials to authenticate an AceBaseClient:`.red);
                        this.debug.warn(``);
                        this.debug.warn(`    username: admin`.red);
                        this.debug.warn(`    password: ${adminPassword}`.red);
                        this.debug.warn(``);
                        this.debug.warn(`THIS IS ONLY SHOWN ONCE!`.red);
                        this.debug.warn(`__________________________________________________________________`.red);
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
                            this.debug.warn(`WARNING: default password for admin user was not changed!`.red);

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
                    authDb.indexes.create(authRef.path, 'username');
                    authDb.indexes.create(authRef.path, 'email');
                    authDb.indexes.create(authRef.path, 'access_token');
                });

                /**
                 * @param {string} clientIp ip address of the user
                 * @param {string} code verification code sent to the user's email address
                 */
                this.verifyEmailAddress = (clientIp, code) => {
                    const verification = decodeVerificationCode(code);
                    return authRef.query().filter('uid', '==', verification.uid).get()
                    .then(snaps => {
                        if (snaps.length !== 1) { const err = new Error(`Uknown user`); err.code = 'unknown_user'; throw err; }
                        /** @type {DbUserAccountDetails} */
                        let user = snaps[0].val();
                        user.uid = snaps[0].key;
                        if (user.email !== verification.email) { const err = new Error(`Account mismatch`); err.code = 'account_mismatch'; throw err; }
                        if (user.email_verification_code !== verification.code) { const err = new Error(`Invalid code`); err.code = 'invalid_code'; throw err; }
                        // Verified
                        return snaps[0].ref.update({ email_verified: true })
                        .then(ref => user);
                    });
                }

                /**
                 * @param {string} clientIp ip address of the user
                 * @param {string} code reset code that was sent to the user's email address
                 * @param {string} newPassword new password chosen by the user
                 */
                this.resetPassword = (clientIp, code, newPassword) => {
                    const verification = decodePasswordResetCode(code);
                    return authRef.query().filter('uid', '==', verification.uid).get()
                    .then(snaps => {
                        if (snaps.length !== 1) { throw new Error(`Uknown user`); }
                        /** @type {DbUserAccountDetails} */
                        let user = snaps[0].val();
                        user.uid = snaps[0].key;

                        if (user.email !== verification.email) { const err = new Error(`Account mismatch`); err.code = 'account_mismatch'; throw err; }
                        if (user.password_reset_code !== verification.code) { const err = new Error(`Invalid code`); err.code = 'invalid_code'; throw err; }
                        if (newPassword.length < 8 || newPassword.includes(' ')) { const err = new Error(`Password must be at least 8 characters, and cannot contain spaces`); err.code = 'password_requirement_mismatch'; throw err; }
                        
                        // Ok to change password
                        const pwd = createPasswordHash(newPassword);                        
                        return snaps[0].ref.update({ 
                            password: pwd.hash, 
                            password_salt: pwd.salt, 
                            password_reset_code: null 
                        })
                        .then(() => user);
                    })
                    .then(user => {
                        // Send confirmation email
                        const request = new AceBaseUserResetPasswordSuccessEmailRequest({
                            date: new Date(),
                            ip: clientIp,
                            user: {
                                uid: user.uid,
                                email: user.email,
                                username: user.username,
                                displayName: user.display_name,
                                settings: user.settings
                            }
                        });
                        this.config.email.send(request);
                        return user;
                    });
                }
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
                    // TODO: implement user.is_admin, so the default admin account can be disabled
                    return true;
                }
                else if (path.startsWith('__')) {
                    // NEW: with the auth database is now integrated into the main database, 
                    // deny access to private resources starting with '__' for non-admins
                    denyDetailsCallback && denyDetailsCallback({ code: 'private', message: `Access to private resource "${path}" not allowed` });
                    return false;
                }

                const env = { now: Date.now(), auth: user || null };
                const pathKeys = PathInfo.getPathKeys(path);
                let rule = accessRules.rules;
                let rulePath = [];
                while(true) {
                    if (!rule) { 
                        denyDetailsCallback && denyDetailsCallback({ code: 'no_rule', message: `No rules set for requested path "${path}", defaulting to false` });
                        return false;
                    }
                    let checkRule = write ? rule['.write'] : rule['.read'];
                    if (typeof checkRule === 'boolean') { 
                        const allow = checkRule; 
                        if (!allow) {
                            denyDetailsCallback && denyDetailsCallback({ code: 'rule', message: `Access denied to path "${path}" by set rule`, rule: checkRule, rulePath: rulePath.join('/') });
                        }
                        return allow;
                    }
                    if (typeof checkRule === 'function') {
                        try {
                            // Execute rule function
                            let allow = checkRule(env);
                            if (!allow) {
                                denyDetailsCallback && denyDetailsCallback({ code: 'rule', message: `Access denied to path "${path}" by set rule`, rule: checkRule.getText(), rulePath: rulePath.join('/') });
                            }
                            return allow;
                        }
                        catch(err) {
                            // If rule execution throws an exception, don't allow. Can happen when rule is "auth.uid === '...'", and auth is null because the user is not signed in
                            denyDetailsCallback && denyDetailsCallback({ code: 'exception', message: `Access denied to path "${path}" by set rule`, rule: checkRule.getText(), rulePath: rulePath.join('/'), details: err });
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
                        const wildcardKey = Object.keys(rule).find(key => key ==='*' || key[0] === '$');
                        if (wildcardKey) { env[wildcardKey] = nextKey; }
                        nextKey = wildcardKey;
                    }
                    nextKey && rulePath.push(nextKey);
                    rule = rule[nextKey];
                }
            };

            /**
             * 
             * @param {string} path 
             * @param {any} data 
             * @param {boolean} partial if the passed data is partial (update instead of set)
             * @returns {{ ok: boolean, validated: boolean, reason?: string }}
             */
            const validateSchema = (path, data, partial = false) => {
                // Process rules to find if there are any ".validate" or ".schema" rules set on given path
                // starts from the root, digs deeper in the path
                const pathKeys = PathInfo.getPathKeys(path);
                let rule = accessRules.rules;
                let rulePath = [];
                let validated = false;
                while(true) {
                    if (!rule) { 
                        return { ok: true, validated };
                    }
                    let validate = rule['.validate']; // NOT implemented yet
                    let checkSchema = rule['.schema'];
                    if (checkSchema) {
                        // Rule set on higher or same path as data being updated
                        const trailKeys = pathKeys.slice(rulePath.length);
                        const checkData = trailKeys.length === 0 ? data : trailKeys.reduce((obj, key, index, arr) => {
                            obj[key] = index === arr.length-1 ? data : { };
                        }, {});
                        validated = true;
                        const result = checkSchema(checkData, partial);
                        if (!result.ok) {
                            return { ok: false, reason: result.reason };
                        }
                    }
                    if (pathKeys.length === 0) {
                        // No more rules set on updating path trail
                        // Check if there are rules set on deeper paths
                        // eg: 
                        // rule set on path 'users/$uid/posts/$postId/tags/$tagId': { name: string, link_id: number }
                        // data being inserted at 'users/352352/posts/572245': { text: 'this is my post', tags: { sometag: 'deny this' } }
                        const checkNestedRules = (parentRule, parentData) => {

                            const childKeys = typeof parentData === 'object' && parentData !== null 
                                ? Object.keys(parentData)
                                : [];
                            const checkKeys = Object.keys(parentRule)
                                .filter(key => 
                                    key === '*' || 
                                    key[0] === '$' || 
                                    (key[0] !== '.' && childKeys.includes(key))
                                )
                                .sort((a, b) => {
                                    // First, check known properties, then wildcards
                                    const wa = a === '*' || a[0] === '$';
                                    const wb = b === '*' || b[0] === '$';
                                    if (!wa && wb) { return -1; }
                                    if (wa && !wb) { return 1; }
                                    return 0;
                                });
                            let failed;
                            const matches = childKeys.length === 0 || checkKeys.every(key => {
                                const rule = parentRule[key];
                                let keepGoing = true;
                                if ('.schema' in rule) {
                                    const checkSchema = rule['.schema'];
                                    const checkChildKeys = key === '*' || key[0] === '$' ? childKeys.filter(key => !checkKeys.includes(key)) : [key];
                                    validated = true;
                                    keepGoing = checkChildKeys.every(key => {
                                        const checkData = parentData[key];
                                        const result = checkSchema(checkData, false);
                                        if (!result.ok) { failed = result; return false; }
                                    })
                                }
                                if (keepGoing) {
                                    return checkNestedRules(rule, checkData); // Dig deeper
                                }
                            });
                            if (!matches) {
                                return failed;
                            }
                            return { ok: true, validated };
                        }
                        return checkNestedRules(rule, data);
                    }
                    let nextKey = pathKeys.shift();
                    // if nextKey is '*' or '$something', rule[nextKey] will be undefined (or match a variable) so there is no 
                    // need to change things here for usage of wildcard paths in subscriptions
                    if (typeof rule[nextKey] === 'undefined') {
                        // Check if current rule has a wildcard child
                        const wildcardKey = Object.keys(rule).find(key => key === '*' || key[0] === '$');
                        // if (wildcardKey) { env[wildcardKey] = nextKey; }
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

            const sendError = (res, err) => {
                if (typeof err.code === 'string') {
                    res.status(400).send({ code: err.code, message: err.message }); // Bad Request
                }
                else {
                    res.status(500).send({ code: 'unknown', message: 'server error', details: err.message }); // Internal server error
                }
            }

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
                        logRef.push({ action: `signin`, type, [type]: username, success: false, code, ip: req.ip, date: new Date() });
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
                        logRef.push({ action: `signin`, type, [type]: username, success: false, code, ip: req.ip, date: new Date() });
                        return callback(null, false, { code, message: `Incorrect ${type}` });
                    }
                    else if (snaps.length > 1) {
                        const code = 'duplicate';
                        logRef.push({ action: `signin`, type, [type]: username, success: false, code, count: snaps.length, ip: req.ip, date: new Date() });
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
                        logRef.push({ action: `signin`, type, [type]: username, ip: req.ip, date: new Date(), success: false, reason: code });
                        return callback(null, false, { code, message: 'Sign in again' });
                    }
                    if (type !== 'access_token') {
                        let hash = user.password_salt ? getPasswordHash(password, user.password_salt) : getOldPasswordHash(password);
                        if (user.password !== hash) {
                            const code = 'wrong_password';
                            logRef.push({ action: `signin`, type, [type]: username, ip: req.ip, date: new Date(), success: false, reason: code });
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
                        logRef.push({ action: `signin`, type, [type]: username, ip: req.ip, date: new Date(), success: true });
    
                        // Add to cache
                        _authCache.set(user.uid, user);
    
                        // Bind user to current request
                        req.user = user;
    
                        return callback(null, user);
                    });
                })
                .catch(err => {
                    logRef.push({ action: `signin`, type, [type]: username, ip: req.ip, date: new Date(), success: false, code: 'unexpected', message: err.message })
                    return callback(err);
                });
            };

            server.on("error", (err) => {
                this.debug.log(err);
            });

            app.use(bodyParser.json({ limit: options.maxPayloadSize, extended: true }));

            app.use((req, res, next) => {
                res.header('Access-Control-Allow-Origin', options.allowOrigin);
                res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
                res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, Accept, Origin, X-Requested-With'); // Safari is not satisfied with *
                if (req.method === 'OPTIONS') {
                    res.sendStatus(200);
                }
                else {
                    next();
                }
            });

            if (options.authentication.enabled) {
                app.use((req, res, next) => {
                    let authorization = req.get('Authorization');
                    if (typeof authorization !== 'string' && 'auth_token' in req.query) {
                        // Enables browser calls to be authenticated                        
                        if (req.path.startsWith('/export/')) {
                            // For now, only allow this if the intention is to call '/export' api call
                            // In the future, use these prerequisites:
                            // - user must be currently authenticated (in cache)
                            // - ip address must match the token
                            authorization = 'Bearer ' + req.query.auth_token;
                        }
                    }
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
                    const clientId = details.client_id || null;  // NEW in AceBaseClient v0.9.4

                    /**
                     * 
                     * @param {Error} err 
                     * @param {DbUserAccountDetails} user 
                     * @param {{ code: string, message: string }} details 
                     */
                    const handle = (err, user, details) => {
                        const client = typeof clientId === 'string' ? clients.get(clientId) : null;
                        if (client) {
                            // Bind user to client socket
                            client.user = user || null;
                        }
                        if (err) {
                            return sendError(err);
                        }
                        if (!user) {
                            return sendNotAuthenticatedError(res, details.code, details.message)
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
                    if (!req.user) {
                        // Strange request.. User wasn't signed in
                        res.send('Bye!');
                        return;
                    }

                    const client = typeof req.client_id === 'string' ? clients.get(req.client_id) : null; // NEW in AceBaseClient v0.9.4
                    if (client) {
                        // Remove user binding from client socket
                        client.user = null;
                    }

                    const signOutEverywhere = typeof req.body === 'object' && req.body.everywhere === true; // NEW in AceBaseClient v0.9.14
                    // TODO: if signOutEverywhere, immediately tell other connected clients to sign out (now they will remain signed in until they retry with access token)

                    // Remove token from cache
                    signOutEverywhere && _authCache.delete(req.user.uid);

                    // Remove token from user's auth node
                    return authRef.child(req.user.uid)
                    .transaction(snap => {
                        if (!snap.exists()) { return; }

                        /** @type {AceBaseUserAccount} */
                        let user = snap.val();
                        if (signOutEverywhere) {
                            user.access_token = null;
                        }
                        user.last_signout = new Date();
                        user.last_signout_ip = req.ip;
                        return user;
                    })
                    .then(() => {
                        logRef.push({ action: 'signout', success: true, uid: req.user.uid, ip: req.ip, date: new Date() });
                        res.send('Bye!');
                    })
                    .catch(err => {
                        logRef.push({ action: 'signout', success: false, code: 'unexpected', message: err.message, uid: req.user.uid, ip: req.ip, date: new Date() });
                        res.statusCode = 500;
                        res.send({ code: 'unexpected', message: err.message });
                    });
                });

                app.post(`/auth/${dbname}/forgot_password`, (req, res) => {
                    const details = req.body;
                    return Promise.resolve()
                    .then(() => {
                        if (!this.config.email || typeof this.config.email.send !== 'function') {
                            const err = new Error('Server email settings have not been configured');
                            err.code = 'server_email_config';
                            throw err;
                        }
                        if (typeof details !== 'object' || typeof details.email !== 'string' || details.email.length === 0) {
                            const err = new Error('Invalid details');
                            err.code = 'invalid_details';
                            throw err;
                        }
                        return authRef.query().filter('email', '==', details.email).get()             
                    })
                    .then(snaps => {
                        if (snaps.length !== 1) { 
                            const err = new Error('Email address not found, or duplicate entries found');
                            err.code = 'invalid_email';
                            throw err;
                        }
                        const snap = snaps[0];
                        /** @type {DbUserAccountDetails} */
                        const user = snap.val();
                        user.uid = snap.key;
                        const resetCode = createPasswordResetCode(user.uid, user.email);

                        // Request a password reset email to be sent:
                        const request = new AceBaseUserResetPasswordEmailRequest({
                            date: new Date(),
                            ip: req.ip,
                            resetCode,
                            user: {
                                email: user.email,
                                uid: user.uid,
                                username: user.username,
                                settings: user.settings,
                                displayName: user.display_name
                            }
                        });
                        return Promise.all([
                            this.config.email.send(request),
                            snap.ref.update({ password_reset_code: resetCode })
                        ])
                    })
                    .then(() => {
                        logRef.push({ action: 'forgot_password', success: true, email: details.email, ip: req.ip, date: new Date() });
                        res.send('OK');
                    })
                    .catch(err => {
                        logRef.push({ action: 'forgot_password', success: false, code: err.code || err.message, email: details.email, ip: req.ip, date: new Date() });
                        sendError(res, err);
                    })
                });

                app.post(`/auth/${dbname}/verify_email`, (req, res) => {
                    const details = req.body;
                    return this.verifyEmailAddress(req.ip, details.code)
                    .then(user => {
                        logRef.push({ action: 'verify_email', success: true, ip: req.ip, date: new Date(), uid: user.uid });
                        res.send('OK');
                    })
                    .catch(err => {
                        logRef.push({ action: 'verify_email', success: false, code: err.code, message: err.message, ip: req.ip, date: new Date(), uid: details.uid });
                        sendError(res, err);
                    });
                }); 
                
                app.post(`/auth/${dbname}/reset_password`, (req, res) => {
                    const details = req.body;
                    return this.resetPassword(req.ip, details.code, details.password)
                    .then(user => {
                        logRef.push({ action: 'reset_password', success: true, ip: req.ip, date: new Date(), uid: user.uid });
                        res.send('OK');
                    })
                    .catch(err => {
                        logRef.push({ action: 'reset_password', success: false, code: err.code, message: err.message, ip: req.ip, date: new Date(), uid: details.uid });
                        sendError(res, err);
                    });
                }); 

                app.post(`/auth/${dbname}/change_password`, (req, res) => {
                    let access_token = req.user && req.user.access_token;
                    const details = req.body;

                    if (typeof details !== 'object' || typeof details.uid !== 'string' || typeof details.password !== 'string' || typeof details.new_password !== 'string') {
                        logRef.push({ action: 'change_password', success: false, code: 'invalid_details', ip: req.ip, date: new Date() });
                        res.status(400).send('Bad Request'); // Bad Request
                        return;                    
                    }
                    if (details.new_password.length < 8 || ~details.new_password.indexOf(' ') || !/[0-9]/.test(details.new_password) || !/[a-z]/.test(details.new_password) || !/[A-Z]/.test(details.new_password)) {
                        logRef.push({ action: 'change_password', success: false, code: 'new_password_denied', ip: req.ip, date: new Date(), uid: details.uid });
                        err = 'Invalid new password, must be at least 8 characters and contain a combination of numbers and letters (both lower and uppercase)';
                        res.status(422).send(err);// Unprocessable Entity
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
                        logRef.push({ action: 'change_pwd', success: false, code: err.code, ip: req.ip, date: new Date(), uid: details.uid });
                        sendError(res, err);
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
                        // return typeof password === 'string' && password.length >= 8 && password.indexOf(' ') < 0 && /[0-9]/.test(password) && /[a-z]/.test(password) && /[A-Z]/.test(password);
                        return typeof password === 'string' && password.length >= 8 && password.indexOf(' ') < 0; // Let client application set their own password rules. Keep minimum length of 8 and no spaces requirement.
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
                    password: { code: 'invalid_password', message: 'Invalid password, must be at least 8 characters and cannot contain spaces' },
                    settings: { code: 'invalid_settings', message: 'Invalid settings, must be an object and contain only string, number and/or boolean values. Additionaly, string values can have a maximum length of 250, and a maximum of 100 settings can be added' }
                };

                app.post(`/auth/${dbname}/signup`, (req, res) => {
                    if (!this.config.authentication.allowUserSignup && (!req.user || req.user.username !== 'admin')) {
                        logRef.push({ action: 'signup', success: false, code: 'user_signup_disabled', ip: req.ip, date: new Date() });
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
                        logRef.push({ action: 'signup', success: false, code: err.code, ip: req.ip, date: new Date() });

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
                            logRef.push({ action: 'signup', success: false, code: 'conflict', ip: req.ip, date: new Date(), username: details.username, email: details.email });
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
                            email_verified: false,
                            email_verification_code: ID.generate(),
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
                            logRef.push({ action: 'signup', success: true, ip: req.ip, date: new Date(), uid });

                            // Cache the user
                            _authCache.set(user.uid, user);

                            // Request welcome e-mail to be sent
                            const request = new AceBaseUserSignupEmailRequest({
                                user: {
                                    uid: user.uid,
                                    username: user.username,
                                    email: user.email,
                                    displayName: user.display_name,
                                    settings: user.settings
                                },
                                date: user.created,
                                ip: user.created_ip,
                                provider: 'acebase',
                                activationCode: user.email_verification_code,
                                emailVerified: false
                            });

                            this.config.email && this.config.email.send(request).catch(err => {
                                logRef.push({ action: 'signup_email', success: false, code: 'unexpected', ip: req.ip, date: new Date(), error: err.message, request });
                            });

                            // Return the positive news
                            const isAdmin = req.user && req.user.uid === 'admin';
                            res.send({ 
                                access_token: isAdmin ? '' : createPublicAccessToken(user.uid, req.ip, user.access_token),
                                user: getPublicAccountDetails(user)
                            });
                        });
                    })
                    .catch(err => {
                        logRef.push({ action: 'signup', success: false, code: 'unexpected', ip: req.ip, date: new Date(), error: err.message, username: details.username, email: details.email });
                        sendError(res, err);
                    });
                });

                app.post(`/auth/${dbname}/update`, (req, res) => {
                    let details = req.body;

                    if (!req.user) {
                        logRef.push({ action: 'update', success: false, code: 'unauthenticated_update', update_uid: details.uid, ip: req.ip, date: new Date() });
                        return sendNotAuthenticatedError(res, 'unauthenticated_update', 'Sign in to change details');
                    }

                    const uid = details.uid || req.user.uid;

                    if (req.user.uid !== 'admin' && (uid !== req.user.uid || typeof details.is_disabled === 'boolean')) {
                        logRef.push({ action: 'update', success: false, code: 'unauthorized_update', auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });
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
                        logRef.push({ action: 'update', success: false, code: err.code, auth_uid: req.user.uid, update_uid: uid, ip: req.ip, date: new Date() });
                        res.status(422).send(err); // Unprocessable Entity
                        return;
                    }

                    let user;
                    return authRef.child(uid)
                    .transaction(snap => {
                        if (!snap.exists()) {
                            const code = 'user_not_found';
                            logRef.push({ action: 'update', success: false, code, auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });

                            res.statusCode = 404; // Not Found
                            res.send({ code, message: `No user found with uid ${uid}` });
                            return;
                        }
                        user = snap.val();
                        if (details.email !== user.email) {
                            user.email = details.email; 
                            user.email_verified = false; // TODO: send verification email
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
                                logRef.push({ action: 'update', success: false, code: 'too_many_settings', auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });
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
                        logRef.push({ action: 'update', success: false, code: 'unexpected', message: err.message, auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });
                        // res.statusCode = 500;
                        // res.send({ code: 'unexpected', message: err.message });
                        sendError(res, err);
                    });
                });

                app.post(`/auth/${dbname}/delete`, (req, res) => {
                    let details = req.body;

                    if (!req.user) {
                        logRef.push({ action: 'delete', success: false, code: 'unauthenticated_delete', delete_uid: details.uid, ip: req.ip, date: new Date() });
                        return sendNotAuthenticatedError(res, 'unauthenticated_delete', 'You are not authorized to perform this operation, your attempt has been logged');
                    }

                    if (req.user.uid !== 'admin' && (details.uid !== req.user.uid || typeof details.is_disabled === 'boolean')) {
                        logRef.push({ action: 'delete', success: false, code: 'unauthorized_delete', auth_uid: req.user.uid, delete_uid: details.uid, ip: req.ip, date: new Date() });
                        return sendUnauthorizedError(res, 'unauthorized_update', 'You are not authorized to perform this operation, your attempt has been logged');
                    }

                    const uid = details.uid || req.user.uid;
                    if (uid === 'admin') {
                        logRef.push({ action: 'delete', success: false, code: 'unauthorized_delete', auth_uid: req.user.uid, delete_uid: details.uid, ip: req.ip, date: new Date() });
                        return sendUnauthorizedError(res, 'unauthorized_update', 'The admin account cannot be deleted, your attempt has been logged');
                    }
                    return authRef.child(uid)
                    .remove()
                    .then(() => {
                        logRef.push({ action: 'delete', success: true, auth_uid: req.user.uid, delete_uid: details.uid, ip: req.ip, date: new Date() });
                        res.send('Farewell');
                    })
                    .catch(err => {
                        logRef.push({ action: 'delete', success: false, code: 'unexpected', auth_uid: req.user.uid, delete_uid: details.uid, ip: req.ip, date: new Date() });
                        res.statusCode = 500;
                        res.send({ code: 'unexpected', message: err.message });
                    })
                });

                app.get(`/oauth2/${dbname}/init`, async (req, res) => {
                    try {
                        const providerName =  req.query.provider;
                        const callbackUrl = req.query.callbackUrl;
                        const provider = this.authProviders[providerName];
                        if (!provider) {
                            throw new Error(`Provider ${provider} is not available, or not properly configured by the db admin`);
                        }
                        const state = Buffer.from(JSON.stringify({ flow: 'redirect', provider: providerName, callbackUrl })).toString('base64');
                        const clientAuthUrl = await provider.init({ redirect_url: `${req.protocol}://${req.headers.host}/oauth2/${dbname}/signin`, state });
                        res.send({ redirectUrl: clientAuthUrl });
                    }
                    catch(err) {
                        res.status(500).send(err.message);
                    }
                });

                app.get(`/oauth2/${dbname}/signin`, async (req, res) => {
                    // This is where the user is redirected to by the provider after signin or error
                    try {
                        const state = JSON.parse(Buffer.from(req.query.state, "base64").toString("utf8"));
                        if (req.query.error) {
                            if (state.flow === 'socket') {
                                const client = clients.get(state.client_id);
                                client.socket.emit('oauth2-signin', { error: req.query.error, reason: req.query.error_reason, description: req.query.error_description, provider: state.provider });
                            }
                            else {
                                const callbackUrl = `${state.callbackUrl}?provider=${state.provider}&error=${req.query.error}&reason=${req.query.error_reason}&description=${req.query.error_description}`;
                                res.redirect(callbackUrl);
                            }
                            return;
                        }

                        // Got authorization code
                        const authCode = req.query.code;
                        const provider = this.authProviders[state.provider];

                        // Get access & refresh tokens
                        const tokens = await provider.getAccessToken({ type: 'auth', auth_code: authCode, redirect_url: `${req.protocol}://${req.headers.host}/oauth2/${dbname}/signin` });

                        let user_details;
                        // TODO: Have we got an id_token?
                        // if (tokens.id_token) {
                        //     // decode, extract user information
                        // }
                        // else {
                        user_details = await provider.getUserInfo(tokens.access_token);
                        // }

                        if (user_details.picture && user_details.picture.length > 0) {
                            // Download it, convert to base64
                            const best = user_details.picture.sort((a,b) => a.width * a.height > b.width * b.height ? -1 : 1)[0]
                            // TODO: Let client do this instead:
                            const { fetch } = require('./oauth-providers/simple-fetch');
                            await fetch(best.url).then(async response => {
                                const contentType = response.headers.get('Content-Type');
                                if (contentType === 'image/png') { //state.provider === 'google' && 
                                    // Don't accept image/png, because it's probably a placeholder image. Google does this by creating a png with people's initials
                                    user_details.picture = [];
                                    return;
                                }
                                const image = await response.arrayBuffer();
                                let buff = new Buffer.from(image);
                                best.url = `data:${contentType};base64,${buff.toString('base64')}`;
                                user_details.picture = [best]; // Only keep the best one
                            });
                        }

                        const getProviderSettings = () => {
                            // Returns an object with any other info the provider has about the user
                            const settings = { [`${state.provider}_id`]: user_details.id };
                            Object.keys(user_details.other).forEach(key => {
                                settings[`${state.provider}_${key}`] = user_details.other[key];
                            });
                            return settings;
                        };
                        const providerUsername = `${state.provider}:${user_details.id}`;

                        // Check if this user exists in the database
                        const query = authRef.query();
                        if (user_details.email) {
                            query.filter('email', '==', user_details.email);
                        }
                        else {
                            // User did not allow reading e-mail address, or provider does not have one (eg whatsapp?)
                            // Switch to using a generated username such as "facebook-3292389234" instead
                            query.filter('username', '==', providerUsername);
                        }
                        let snaps = await query.get();
                        if (snaps.length === 0 && user_details.email) {
                            // Try again with providerUsername, use might previously have denied access to email, 
                            // and now has granted access. In that case, we'll already have an account with the 
                            // generated providerUsername
                            snaps = await authRef.query().filter('username', '==', providerUsername).get();
                        }
                        /** @type {DbUserAccountDetails} */
                        let user;
                        if (snaps.length === 1) {
                            const uid = snaps[0].key;
                            user = snaps[0].val();
                            user.uid = uid;

                            // Update user details
                            user.email_verified = user.email_verified || user_details.email_verified;
                            user.email = user.email || user_details.email;
                            if (user_details.picture && user_details.picture.length > 0) {
                                user.picture = user_details.picture[0];
                            }
                            await authRef.child(uid).update({
                                email: user.email || null,
                                email_verified: user.email_verified,
                                last_signin: new Date(),
                                last_signin_ip: req.ip,
                                picture: user.picture
                            });
                            // Add provider details
                            await authRef.child(uid).child('settings').update(getProviderSettings());

                            // Log success
                            logRef.push({ action: 'oauth2_signin', success: true, ip: req.ip, date: new Date(), uid });

                            // Cache the user
                            _authCache.set(user.uid, user);

                            // Request signin e-mail to be sent
                            const request = new AceBaseUserSignInEmailRequest({
                                user: {
                                    uid: user.uid,
                                    username: user.username,
                                    email: user.email,
                                    displayName: user.display_name,
                                    settings: user.settings
                                },
                                date: user.created,
                                ip: req.ip,
                                activationCode: user.email_verification_code,
                                emailVerified: user.email_verified,
                                provider: state.provider
                            });

                            this.config.email && this.config.email.send(request).catch(err => {
                                logRef.push({ action: 'oauth2_login_email', success: false, code: 'unexpected', ip: req.ip, date: new Date(), error: err.message, request });
                            });                            
                        }
                        else if (snaps.length === 0) {
                            // User does not exist, create

                            if (!this.config.authentication.allowUserSignup) {
                                logRef.push({ action: 'oauth2_signup', success: false, code: 'user_signup_disabled', provider: state.provider, email: user_details.email, date: new Date() });
                                res.statusCode = 403; // Forbidden
                                return res.send({ code: 'admin_only', message: 'Only admin is allowed to create users' });
                            }

                            // Create user with Generated password
                            let pwd = createPasswordHash(generatePassword());
                            user = {
                                username: typeof user_details.email === 'undefined' ? providerUsername : null, // provider-accountid usernames for external accounts without email address
                                email: user_details.email || null,
                                email_verified: user_details.email_verified, // trust provider's verification
                                email_verification_code: ID.generate(),
                                display_name: user_details.display_name,
                                password: pwd.hash,
                                password_salt: pwd.salt,
                                created: new Date(),
                                created_ip: req.ip,
                                access_token: ID.generate(),
                                access_token_created: new Date(),
                                last_signin: new Date(),
                                last_signin_ip: req.ip,
                                picture: user_details.picture && user_details.picture[0],
                                settings: getProviderSettings()
                            };
    
                            const userRef = await authRef.push(user);
                            const uid = userRef.key;
                            user.uid = uid;

                            // Log success
                            logRef.push({ action: 'oauth2_signup', success: true, ip: req.ip, date: new Date(), uid });

                            // Cache the user
                            _authCache.set(user.uid, user);

                            // Request welcome e-mail to be sent
                            const request = new AceBaseUserSignupEmailRequest({
                                user: {
                                    uid: user.uid,
                                    username: user.username,
                                    email: user.email,
                                    displayName: user.display_name,
                                    settings: user.settings
                                },
                                date: user.created,
                                ip: user.created_ip,
                                activationCode: user.email_verification_code,
                                emailVerified: user.email_verified,
                                provider: state.provider
                            });
    
                            this.config.email && this.config.email.send(request).catch(err => {
                                logRef.push({ action: 'oauth2_signup_email', success: false, code: 'unexpected', ip: req.ip, date: new Date(), error: err.message, request });
                            });
                        }
                        else {
                            // More than 1?!!
                            const callbackUrl = `${state.callbackUrl}?provider=${state.provider}&error=account_duplicates`;
                            return res.redirect(callbackUrl);
                        }

                        let result = { 
                            provider: {
                                name: state.provider, 
                                access_token: tokens.access_token,
                                refresh_token: tokens.refresh_token,
                                expires_in: tokens.expires_in
                            },
                            access_token: createPublicAccessToken(user.uid, req.ip, user.access_token),
                            user: getPublicAccountDetails(user)
                        };

                        if (state.flow === 'socket') {
                            const client = clients.get(state.client_id);
                            client.socket.emit('oauth2-signin', { action: 'success', result });
                            res.send(`<html><script>window.close()</script><body>You can <a href="javascript:window.close()">close</a> this page</body></html>`)                        
                        }
                        else {
                            const base64Result = Buffer.from(JSON.stringify(result)).toString('base64');
                            const callbackUrl = `${state.callbackUrl}?result=${base64Result}`;
                            res.redirect(callbackUrl);
                        }
                    }
                    catch(err) {
                        res.status(500).send(err.message);
                    }
                });

                app.get(`/oauth2/${dbname}/refresh`, async (req, res) => {
                    try {
                        const providerName =  req.query.provider;
                        const refreshToken = req.query.refresh_token;
                        const provider = this.authProviders[providerName];
                        if (!provider) {
                            throw new Error(`Provider ${provider} is not available, or not properly configured by the db admin`);
                        }
                        if (!refreshToken) {
                            throw new Error(`No refresh_token passed`);
                        }
                        // Get new access & refresh tokens
                        const tokens = await provider.getAccessToken({ type: 'refresh', refresh_token: refreshToken });
                        res.send({
                            provider: {
                                name: providerName,
                                access_token: tokens.access_token,
                                refresh_token: tokens.refresh_token,
                                expires_in: tokens.expires_in
                            }
                        });
                    }
                    catch(err) {
                        res.status(500).send(err.message);
                    }
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
                const info = {
                    time: new Date(), 
                    process: process.pid
                };
                if (true || req.user && req.user.uid === 'admin') {
                    const os = require('os');
                    const numberToByteSize = number => {
                        return Math.round((number / 1024 / 1024) * 100) / 100 + 'MB';
                    }
                    const sPerMinute = 60;
                    const sPerHour = sPerMinute * 60;
                    const sPerDay = sPerHour * 24;
                    const numberToTime = number => {
                        const days = Math.floor(number / sPerDay);
                        number -= sPerDay * days;
                        const hours = Math.floor(number / sPerHour);
                        number -= hours * sPerHour;
                        const minutes = Math.floor(number / sPerMinute);
                        number -= minutes * sPerMinute;
                        const seconds = Math.floor(number);
                        return `${days}d${hours}h${minutes}m${seconds}s`;
                    }
                    const adminInfo = {
                        dbname: dbname,
                        platform: os.platform(),
                        arch: os.arch(),
                        release: os.release(),
                        host: os.hostname(),
                        uptime: numberToTime(os.uptime()),
                        load: os.loadavg(),
                        mem: {
                            total: numberToByteSize(os.totalmem()),
                            free: numberToByteSize(os.freemem())
                        },
                        cpus: os.cpus(),
                        network: os.networkInterfaces()
                    }
                    Object.assign(info, adminInfo);
                }
                // for (let i = 0; i < 1000000000; i++) {
                //     let j = Math.pow(i, 2);
                // }
                res.send(info);
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
                // if (!req.user || req.user.username !== 'admin') {
                //     return sendUnauthorizedError(res, 'admin_only', 'only admin can use reflection api');
                // }
                const path = req.path.substr(dbname.length + 10);
                if (!userHasAccess(req.user, path, false, denyDetails => sendUnauthorizedError(res, denyDetails.code, denyDetails.message))) {
                    return;
                }
                const impersonatedAccess = {
                    uid: (!req.user || req.user.username !== 'admin') ? null : req.query.impersonate,
                    read: {
                        allow: false,
                        error: null
                    },
                    write: {
                        allow: false,
                        error: null
                    }
                };
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

                const ref = db.ref(path);
                res.setHeader('Content-Disposition', `attachment; filename=${ref.key || 'export'}.json`); // Will be treated as a download in browser
                
                ref.export(stream, { format })
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

                let validation = validateSchema(path, val, true);
                let updatePromise;
                if (validation.ok && validation.validated && typeof val === 'object' && val.constructor === Object) {
                    // Schema validation was triggered for this path. If this update is on a non-existing path, we have
                    // to run validation again because updates are not partial, they create the new node
                    updatePromise = db.ref(path).exists().then(exists => {
                        if (exists) {
                            // Proceed as normal, do not check existing data possibly inserted before schema rules 
                            // were set/changed. This prevents old data becoming stale.
                            return db.ref(path).update(val);
                        }
                        // Target node does not exist. We must validate schema again with "partial" off
                        // to check if it contains all compulsory data
                        validation = validateSchema(path, val, false);
                        if (validation.ok) {
                            // Set instead of update
                            return db.ref(path).set(val);
                        }
                    });
                }
                else {
                    // No schema validation used
                    updatePromise = db.ref(path).update(val);
                }

                updatePromise
                .then(() => {
                    if (!validation.ok) {
                        logRef.push({ action: 'update_data', success: false, code: 'schema_validation_failed', path, error: validation.reason });
                        res.status(422).send({ code: 'schema_validation_failed', message:validation.reason });
                    }
                    else {
                        res.send({
                            success: true
                        });
                    }
                })
                .catch(err => {
                    this.debug.error(`failed to update "${path}":`, err);
                    logRef.push({ action: 'update_data', success: false, code: `unknown_error`, path, error: err.message });
                    sendError(res, err);
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

                const validation = validateSchema(path, val);
                if (!validation.ok) {
                    logRef.push({ action: 'set_data', success: false, code: 'schema_validation_failed', path, error: validation.reason });
                    return res.status(422).send({ code: 'schema_validation_failed', message:validation.reason });
                }

                db.ref(path)
                .set(val)
                .then(ref => {
                    res.send({
                        success: true
                    });
                })
                .catch(err => {
                    this.debug.error(`failed to set "${path}":`, err);
                    logRef.push({ action: 'set_data', success: false, code: 'unknown_error', path, error: err.message });
                    sendError(res, err);
                });
            });

            app.post(`/query/${dbname}/*`, (req, res) => {
                // Execute query
                const path = req.path.substr(dbname.length + 8);
                if (!userHasAccess(req.user, path, false, denyDetails => sendUnauthorizedError(res, denyDetails.code, denyDetails.message))) {
                    return;
                }

                const data = Transport.deserialize(req.body);
                // //const ref = db.ref(path);
                // const query = db.query(path);
                // data.query.filters.forEach(filter => {
                //     query.where(filter.key, filter.op, filter.compare);
                // });
                // data.query.order.forEach(order => {
                //     query.order(order.key, order.ascending);
                // });
                // if (data.query.skip > 0) {
                //     query.skip(data.query.skip);
                // }
                // if (data.query.take > 0) {
                //     query.take(data.query.take);
                // }
                const query = data.query;
                const options = data.options;
                if (options.monitor === true) {
                    options.monitor = { add: true, change: true, remove: true };
                }
                if (typeof options.monitor === 'object' && (options.monitor.add || options.monitor.change || options.monitor.remove)) {
                    const queryId = data.query_id;
                    const clientId = data.client_id;
                    const client = clients.get(clientId);
                    client.realtimeQueries[queryId] = { path, query, options };
                    
                    const sendEvent = event => {
                        const client = clients.get(clientId);
                        if (!client) { return false; } // Not connected, stop subscription
                        if (!userHasAccess(client.user, event.path, false)) {
                            return false; // Access denied, stop subscription
                        }
                        event.query_id = queryId;
                        const data = Transport.serialize(event);
                        client.socket.emit('query-event', data);
                    }
                    options.eventHandler = sendEvent;
                }
                return db.api.query(path, query, options) //query.get(options)
                .then(results => {
                    const response = {
                        count: results.length,
                        list: results // []
                    };
                    // results.forEach(result => {
                    //     if (data.options.snapshots) {
                    //         response.list.push({ path: result.ref.path, val: result.val() });
                    //     }
                    //     else {
                    //         response.list.push(result.path);
                    //     }
                    // });
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
                        this.debug.error(`failed to query "${path}":`, err);
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

                this.debug.verbose(`Transaction ${tx.id} starting...`);
                // const ref = db.ref(tx.path);
                const donePromise = db.api.transaction(tx.path, val => {
                    this.debug.verbose(`Transaction ${tx.id} started with value: `, val);
                    const currentValue = Transport.serialize(val);
                    const promise = new Promise((resolve) => {
                        tx.finish = (val) => {
                            this.debug.verbose(`Transaction ${tx.id} finishing with value: `, val);
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
                this.debug.log(`"${dbname}" database server running at ${this.config.url}`);
                this._ready === true;
                this.emit(`ready`);
            });

            // Websocket implementation:
            const clients = {
                list: [],
                get(id) {
                    return this.list.find(client => client.id === id);
                },
                add(socket) {
                    const client = {
                        socket,
                        id: socket.id,
                        subscriptions: {},
                        realtimeQueries: {},
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

            /** @type {Map<string, Client>} */
            // const clientsNew = new Map();

            io.sockets.on("connection", socket => {
                const client = clients.add(socket);
                client.signInToken = ID.generate();
                this.debug.verbose(`New socket connected, total: ${clients.list.length}`);
                socket.emit("welcome");

                socket.on("disconnect", data => {
                    // We lost one
                    // const client = clients.get(socket.id);
                    // if (!client) { return; } // Disconnected a client we did not know? Don't crash, just ignore.
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
                    this.debug.verbose(`Socket disconnected, total: ${clients.list.length}`);
                });

                socket.on("reconnect", data => {
                    let prevSocketId = data.id;
                    clients.list.push(client);
                    this.debug.verbose(`Socket reconnected, total: ${clients.list.length}`);
                    // TODO: implement cached notification sending
                });

                socket.on("signin", accessToken => {
                    // client sends this request once user has been signed in, binds the user to the socket, 
                    // deprecated since client v0.9.4, which sends client_id with signin api call
                    // const client = clients.get(socket.id);
                    let uid;
                    try {
                        uid = decodePublicAccessToken(accessToken).uid;
                        client.user = _authCache.get(uid) || null;
                    }
                    catch(err) {
                        // no way to bind the user
                        this.debug.error(`websocket: invalid access token passed to signin: ${accessToken}`);
                    }
                });

                socket.on("signout", data => {
                    // deprecated since client v0.9.4, which sends client_id with signout api call
                    // const client = clients.get(socket.id);
                    client.user = null;
                });

                socket.on("oauth2-signin", async providerName => {
                    try {
                        const provider = this.authProviders[providerName];
                        const state = Buffer.from(JSON.stringify({ flow: 'socket', provider: providerName, client_id: client.id })).toString('base64');
                        const clientAuthUrl = await provider.init({ redirectUrl: `${req.protocol}://${req.headers.host}/ouath2/${dbname}/signin`, state });
                        socket.emit('oauth2-signin', { action: 'auth', url: clientAuthUrl });
                    }
                    catch(err) {
                        this.debug.error(`websocket: cannot sign in with oauth provider ${providerName}`);
                        socket.emit('oauth2-signin', { error: err.message });
                    }
                });

                socket.on("subscribe", data => {
                    // Client wants to subscribe to events on a node
                    const subscriptionPath = data.path;

                    // Get client
                    // const client = clients.get(socket.id);

                    if (!userHasAccess(client.user, subscriptionPath, false)) {
                        logRef.push({ action: `subscribe`, success: false, code: `access_denied`, uid: client.user ? client.user.uid : '-', path: subscriptionPath });
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
                                // DISABLED: logRef.push({ action: `access_revoked`, uid: client.user ? client.user.uid : '-', path: subscriptionPath });
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
                        this.debug.verbose(`Sending data event "${data.event}" for path "/${path}" to client ${socket.id}`);
                        socket.emit("data-event", {
                            subscr_path: subscriptionPath,
                            path,
                            event: data.event,
                            val
                        });
                    };
                    this.debug.verbose(`Client ${socket.id} subscribes to event "${data.event}" on path "/${data.path}"`);
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

                socket.on("query_unsubscribe", data => {
                    // Client unsubscribing from realtime query events
                    this.debug.verbose(`Client ${socket.id} is unsubscribing from realtime query "${data.query_id}"`);
                    // const client = clients.get(socket.id);
                    delete client.realtimeQueries[data.query_id];
                })

                socket.on("unsubscribe", data => {
                    // Client unsubscribes from events on a node
                    this.debug.verbose(`Client ${socket.id} is unsubscribing from event "${data.event || '(any)'}" on path "/${data.path}"`);
                    
                    // const client = clients.get(socket.id);
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
                        //this.debug.verbose(`   - unsubscribing from event ${subscr.event} with${subscr.callback ? "" : "out"} callback on path "${data.path}"`);
                        db.api.unsubscribe(subscr.path, subscr.event, subscr.callback); //db.api.unsubscribe(data.path, subscr.event, subscr.callback);
                        pathSubs.splice(pathSubs.indexOf(subscr), 1);
                    });
                    if (pathSubs.length === 0) {
                        // No subscriptions left on this path, remove the path entry
                        delete client.subscriptions[data.path];
                    }
                });

                socket.on("transaction", data => {
                    this.debug.verbose(`Client ${socket.id} is sending ${data.action} transaction request on path "${data.path}"`);
                    // const client = clients.get(socket.id);

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
                        this.debug.verbose(`Transaction ${tx.id} starting...`);
                        // const ref = db.ref(tx.path);
                        const donePromise = db.api.transaction(tx.path, val => {
                            this.debug.verbose(`Transaction ${tx.id} started with value: `, val);
                            const currentValue = Transport.serialize(val);
                            const promise = new Promise((resolve) => {
                                tx.finish = (val) => {
                                    this.debug.verbose(`Transaction ${tx.id} finishing with value: `, val);
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
                                this.debug.verbose(`Transaction ${tx.id} finished`);
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

    verifyEmailAddress(code) {
        throw new Error(`authentication is not enabled`);
    }

    configAuthProvider(providerName, settings) {
        if (!this.config.authentication.enabled) {
            throw new Error(`Authentication is not enabled`);
        }
        try {
            const { AuthProvider } = require('./oauth-providers/' + providerName);
            const provider = new AuthProvider(settings);
            this.authProviders[providerName] = provider;
        }
        catch(err) {
            throw new Error(`Failed to configure provider ${providerName}: ${err.message}`)
        }
    }
}

if (__filename.replace(/\\/g,"/").endsWith("/acebase-server.js") && process.argv[2] === "start") {
    // If one executed "node server.js start [hostname] [port]"
    const dbname = process.argv[3] || process.env.DBNAME || "default";
    const host = process.argv[4] || process.env.HOST || "0.0.0.0";
    const port = process.argv[5] || process.env.PORT || 3000;
    const options = { host , port };
    const server = new AceBaseServer(dbname, options);
    server.once("ready", () => {
        server.debug.log(`AceBase server running`);
    });
}

module.exports = { 
    AceBaseServer, 
    AceBaseServerSettings, 
    AceBaseClusterSettings,
    AceBaseEmailRequest,
    AceBaseUserSignupEmailRequest,
    AceBaseUserResetPasswordEmailRequest,
    AceBaseUserResetPasswordSuccessEmailRequest
};