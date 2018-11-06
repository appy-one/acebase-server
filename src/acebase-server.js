
const { EventEmitter } = require('events');
const { AceBase, AceBaseSettings, transport, DataSnapshot } = require('acebase');
const { getPathKeys } = require('acebase/src/utils');
const { ID } = require('acebase/src/id');
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
        this.enabled = typeof settings === "object";
        if (!this.enabled) { return; }
        if (settings.keyPath) {
            this.key = fs.readFileSync(settings.keyPath);
            this.cert = fs.readFileSync(settings.certPath);
        }
        else if (settings.pfxFile) {
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
     * @param {{logLevel?: string, host?: string, port?: number, path?: string, https?: {keyPath:string, certPath:string}|{ pfxPath:string, passphrase:string }, authentication?: AceBaseServerAuthenticationSettings }} settings 
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
    }
}

class AccessDeniedError extends Error { }

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

        const dbOptions = new AceBaseSettings({
            logLevel: options.logLevel,
            storage: {
                // cluster: options.cluster,
                path: options.path
            },
        });

        const db = new AceBase(dbname, dbOptions);
        const authDb = options.authentication.enabled
            ? new AceBase('auth', { logLevel: dbOptions.logLevel, storage: { path: `${options.path}/${dbname}.acebase` } })
            : null;

        // process.on("unhandledRejection", (reason, p) => {
        //     console.log("Unhandled Rejection at: ", reason.stack);
        // });

        const getPasswordHash = (password) => {
            return crypto.createHash('md5').update(password).digest('hex');
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
                authDb.indexes.create('accounts', 'username');
                authDb.indexes.create('accounts', 'access_token');
                authRef.child('admin').transaction(snap => {

                    let adminAccount = snap.val();
                    if (!snap.exists()) {
                        // Use provided default password, or generate one:
                        const adminPassword = options.authentication.defaultAdminPassword  || Array.prototype.reduce.call('abcedefghijkmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ012345789!@#$%&', (password, c, i, chars) => {
                            if (i > 15) { return password; }
                            return password + chars[Math.floor(Math.random() * chars.length)];
                        }, '');
                        const passwordHash = getPasswordHash(adminPassword);

                        adminAccount = {
                            username: 'admin',
                            display_name: `${dbname} AceBase admin`,
                            password: passwordHash,
                            change_password: true,  // flags that password must be changed. Not implemented yet
                            created: new Date(),
                            access_token: null // Will be set upon login, so bearer authentication strategy can find user with this token
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
                        return adminAccount;
                    }
                    else if (options.authentication.defaultAdminPassword) {
                        const passwordHash = getPasswordHash(options.authentication.defaultAdminPassword);
                        if (adminAccount.password === passwordHash) {
                            console.error(`WARNING: default password for admin user was not changed!`);
                        }
                    }
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
                        if (~['.read', '.write', '.validate'].indexOf(key) && typeof rule === 'string') {
                            // Convert to function
                            const text = rule;
                            rule = eval(`(env => { const { now, root, NewData, data, auth, ${variables.join(', ')} } = env; return ${text}; })`);
                            rule.getText = () => {
                                return text;
                            }
                            parent[key] = rule;
                        }
                        else if (key.startsWith('$')) {
                            variables.push(key);
                        }
                        if (typeof rule === 'object') {
                            processRules(rule, variables);
                        }
                    });
                };
                processRules(accessRules.rules, []);                
            }
            
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
                const pathKeys = getPathKeys(path);
                let rule = accessRules.rules;
                let rulePath = [];
                while(true) {
                    if (!rule) { 
                        denyDetailsCallback && denyDetailsCallback({ reason: 'no_rule', details: 'No rules set for requested path, defaulting to false' });
                        return false; 
                    }
                    let checkRule = write ? rule['.write'] : rule['.read'];
                    if (typeof checkRule === 'boolean') { 
                        const allow = checkRule; 
                        if (!allow) {
                            denyDetailsCallback && denyDetailsCallback({ reason: 'rule', rule: checkRule, rulePath: rulePath.join('/') });
                        }
                        return allow;
                    }
                    if (typeof checkRule === 'function') {
                        try {
                            // Execute rule function
                            let allow = checkRule(env);
                            if (!allow) {
                                denyDetailsCallback && denyDetailsCallback({ reason: 'rule', rule: checkRule.getText(), rulePath: rulePath.join('/') });
                            }
                            return allow;
                        }
                        catch(err) {
                            // If rule execution throws an exception, don't allow. Can happen when rule is "auth.uid === '...'", and auth is null because the user is not signed in
                            denyDetailsCallback && denyDetailsCallback({ reason: 'exception', rule: checkRule.getText(), rulePath: rulePath.join('/'), details: err });
                            return false; 
                        }
                    }
                    let nextKey = pathKeys.shift();
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

            const sendUnauthorizedError = (res, reason = 'Unauthorized') => {
                res.statusCode = 401;
                res.send(reason);
            };

            /** @type {Map<string, User>} */
            const _authCache = new Map();  // Maps access tokens to users

            /**
             * 
             * @param {string} accessToken 
             * @param {(err, user, details) => void} callback 
             */
            const checkToken = function(accessToken, callback) {
                authRef.query().where('access_token', '==', accessToken).get()
                .then(snaps => {
                    if (snaps.length === 0) {
                        return callback(null, false, { message: 'Invalid access token. Sign in again' });
                    }
                    else if (snaps.length > 1) {
                        return callback(null, false, { message: `Duplicate access_token found. Sign in again` });
                    }
                    /** @type {DataSnapshot} */ 
                    const snap = snaps[0];
                    const user = snap.val();
                    user.uid = snap.key;
                    user.previous_signin = user.last_signin;
                    user.last_token_signin = new Date();
                    // Update user in db
                    snap.ref.update({
                        last_token_signin: user.last_token_signin
                    });
                    // Add to cache
                    _authCache.set(user.access_token, user);
                    return callback(null, user);
                })
                .catch(err => {
                    return callback(err);
                });                
            };

            /**
             * 
             * @param {string} username 
             * @param {string} password 
             * @param {(err, user, details) => void} callback 
             */
            const checkLogin = function(username, password, callback) {
                authRef.query().where('username', '==', username).get()
                .then(snaps => {
                    if (snaps.length === 0) {
                        return callback(null, false, { message: 'Incorrect username' });
                    }
                    else if (snaps.length > 1) {
                        return callback(null, false, { message: `${snaps.length} users found with username "${username}". Contact your database administrator` });
                        // throw new Error(`More than 1 user found with the same username. Contact your database administrator`);
                    }

                    /** @type {DataSnapshot} */ 
                    const snap = snaps[0];
                    const user = snap.val();
                    if (user.password !== getPasswordHash(password)) {
                        return callback(null, false, { message: 'Incorrect password' });
                    }
                    // Generate access token, add properties to user
                    user.uid = snap.key;
                    user.access_token = ID.generate();
                    user.previous_signin = user.last_signin;
                    user.last_signin = new Date();
                    // Update user in db
                    snap.ref.update({
                        access_token: user.access_token,
                        last_signin: user.last_signin
                    });
                    // Add to cache
                    _authCache.set(user.access_token, user);
                    return callback(null, user);
                })
                .catch(err => {
                    return callback(err);
                });
            };


            server.on("error", (err) => {
                console.log(err);
            });

            app.use(bodyParser.json());

            if (options.authentication.enabled) {
                app.use((req, res, next) => {
                    const authorization = req.get('Authorization');
                    if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
                        const token = authorization.slice(7);

                        // Is this token cached?
                        const cachedUser = _authCache.get(token);
                        if (cachedUser) {
                            req.user = cachedUser;
                            return next();
                        }

                        // Not cached, query database to get user for this token
                        checkToken(token, (err, user, details) => {
                            if (err) {
                                return sendUnauthorizedError(res, details);
                            }
                            req.user = user;
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

                    const handle = (err, user, details) => {
                        if (err) {
                            res.statusCode = 500;
                            res.send(err.message);
                            return;
                        }
                        if (!user) {
                            res.statusCode = 401;
                            res.statusMessage = details.message;
                            res.send(details.message);
                            return;
                        }
                        res.send({ 
                            access_token: user.access_token, 
                            user: { 
                                uid: user.uid, 
                                username: user.username, 
                                display_name: user.display_name, 
                                created: user.created, 
                                last_signin: user.previous_signin 
                            } 
                        });
                    };
                    if (details.method === 'token') {
                        checkToken(details.access_token, handle);
                    }
                    else {
                        checkLogin(details.username, details.password, handle);
                    }
                });

                app.post(`/auth/${dbname}/signout`, (req, res) => {
                    // Remove access token from cache
                    const token = req.user && req.user.access_token;
                    if (token) {
                        _authCache.delete(token);
                    }

                    // Remove token from user's auth node
                    return authRef.child(token).transaction(snap => {
                        if (!snap.exists()) { return; }
                        let user = snap.val();
                        user.access_token = null;
                        user.last_signout = new Date();
                        return user;
                    })
                    .then(() => {
                        res.send('Bye!');
                    })
                    .catch(err => {
                        res.statusCode = 500;
                        res.send(`Error: ${err.message}`);
                    });
                });

                app.post(`/auth/${dbname}/change_password`, (req, res) => {
                    let access_token = req.user && req.user.access_token;
                    const details = req.body;

                    if (typeof details !== 'object' || typeof details.uid !== 'string' || typeof details.password !== 'string' || typeof details.new_password !== 'string') {
                        res.statusCode = 400; // Bad Request
                        res.send('Bad Request');
                        return;                    
                    }
                    if (details.new_password.length < 8 || ~details.new_password.indexOf(' ') || !/[0-9]/.test(details.new_password) || !/[a-z]/.test(details.new_password) || !/[A-Z]/.test(details.new_password)) {
                        err = 'Invalid new password, must be at least 8 characters and contain a combination of numbers and letters (both lower and uppercase)';
                        res.statusCode = 422; // Unprocessable Entity
                        res.send(err);
                        return;
                    }

                    return authRef.child(details.uid).transaction(snap => {
                        if (!snap.exists()) {
                            throw new Error(`Unknown uid`);
                        }
                        let user = snap.val();
                        if (user.password !== getPasswordHash(details.password)) {
                            throw new Error(`Wrong password`);
                        }
                        if (access_token && access_token !== user.access_token) {
                            throw new Error(`Cannot change password while signed in as other user, or with an old token`);
                        }
                        if (access_token) {
                            _authCache.delete(access_token);
                        }
                        access_token = ID.generate();
                        user.access_token = ID.generate();
                        user.password = getPasswordHash(details.new_password);
                        _authCache.set(user.access_token, user);
                        return user;
                    })
                    .then(userRef => {
                        res.send({ access_token }); // Client must use this new access token from now on
                    })
                    .catch(err => {
                        res.statusCode = 400; // Bad Request, do not expose real reason
                        res.send('Bad Request');
                    });
                });

                app.post(`/auth/${dbname}/signup`, (req, res) => {
                    // if (!this.config.authentication.enabled) {
                    //     res.statusCode = 405; // Method Not Allowed
                    //     return res.send('Disabled');
                    // }
                    if (!this.config.authentication.allowUserSignup && (!req.user || req.user.username !== 'admin')) {
                        res.statusCode = 403; // Forbidden
                        return res.send('Forbidden');
                    }

                    // Create user if it doesn't exist yet.
                    // TODO: Rate-limit nr of signups per IP to prevent abuse
                    
                    const details = req.body;

                    // Check if sent details are ok
                    let err;
                    if (details.username === 'admin' || typeof details.username !== 'string' || details.username.length < 5) {
                        err = 'Invalid username, must be at least 5 characters';
                    }
                    else if (typeof details.display_name !== 'string' || details.display_name.length < 5) {
                        err = 'Invalid display_name, must be at least 5 characters';
                    }
                    else if (typeof details.password !== 'string' || details.password.length < 8 || ~details.password.indexOf(' ') || !/[0-9]/.test(details.password) || !/[a-z]/.test(details.password) || !/[A-Z]/.test(details.password)) {
                        err = 'Invalid password, must be at least 8 characters and contain a combination of numbers and letters (both lower and uppercase)';
                    }
                    if (err) {
                        res.statusCode = 422; // Unprocessable Entity
                        res.send(err);
                        return;
                    }

                    // Check if user doesn't already exist
                    authRef.query().where('username', '==', details.username).get()
                    .then(snaps => {
                        if (snaps.length > 0) {
                            res.statusCode = 409; // conflict
                            res.send(`Username "${details.username}" is taken`);
                            return;
                        }

                        // Ok, create user
                        let token = ID.generate();
                        const user = {
                            username: details.username,
                            display_name: details.display_name,
                            password: getPasswordHash(details.password),
                            change_password: false,
                            created: new Date(),
                            access_token: token
                        };

                        return authRef.push(user)
                        .then(ref => {
                            const uid = ref.key;
                            user.uid = uid;

                            // Cache the user
                            _authCache[uid] = user;

                            // Return the positive news
                            res.send({ 
                                access_token: token, 
                                user: { 
                                    uid: user.uid, 
                                    username: user.username, 
                                    display_name: 
                                    user.display_name, 
                                    created: user.created 
                                } 
                            });
                        });
                    })
                    .catch(err => {
                        res.statusCode = 500;
                        res.send(err.message);
                    });
                });

            }

            app.get('/', (req, res) => {
                res.sendFile(__dirname + '/index.html'); // TODO: create login page and data browser
            });

            app.get("/info", (req, res) => {
                let obj = {
                    time: new Date(), 
                    process: process.pid,
                    dbname: dbname
                }
                res.send(obj);
            });

            app.get(`/data/${dbname}/*`, (req, res) => {
                // Request data
                const path = req.path.substr(dbname.length + 7); //.replace(/^\/+/g, '').replace(/\/+$/g, '');
                if (!userHasAccess(req.user, path, false, denyDetails => sendUnauthorizedError(res, denyDetails))) {
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
                    const ser = transport.serialize(snap.val());
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
                    return sendUnauthorizedError(res, 'only admin can use reflection api');
                }
                const path = req.path.substr(dbname.length + 10);
                const type = req.query.type;
                const args = {};
                Object.keys(req.query).forEach(key => {
                    // if (key.startsWith('arg_')) {
                    //     args[key.slice(4)] = req.query[key];
                    // }
                    if (key !== 'type') {
                        args[key] = req.query[key];
                    }                    
                });

                db.ref(path)
                .reflect(type, args)
                .then(result => {
                    res.send(result);
                })
                .catch(err => {
                    res.statusCode = 500;
                    res.send(err);
                });
            });

            app.get(`/exists/${dbname}/*`, (req, res) => {
                // Exists query
                const path = req.path.substr(dbname.length + 9);
                if (!userHasAccess(req.user, path, false, denyDetails => sendUnauthorizedError(res, denyDetails))) {
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
                if (!userHasAccess(req.user, path, true, denyDetails => sendUnauthorizedError(res, denyDetails))) {
                    return;
                }

                const data = req.body;
                const val = transport.deserialize(data);

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
                if (!userHasAccess(req.user, path, true, denyDetails => sendUnauthorizedError(res, denyDetails))) {
                    return;
                }

                const data = req.body;
                const val = transport.deserialize(data);

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
                if (!userHasAccess(req.user, path, false)) {
                    return sendUnauthorizedError(res);
                }

                const data = transport.deserialize(req.body);
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
                    res.send(transport.serialize(response));
                });
            });

            app.get(`/index/${dbname}`, (req, res) => {
                // Get all indexes
                db.indexes.list()
                .then(indexes => {
                    res.send(indexes);
                });
            });

            app.post(`/index/${dbname}`, (req, res) => {
                // create index
                if (!req.user || req.user.username !== 'admin') {
                    return sendUnauthorizedError(res, 'only admin can create indexes');
                }

                const data = req.body;
                if (data.action === "create") {
                    db.indexes.create(data.path, data.key)
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

            server.listen(this.config.port, this.config.hostname, () => {
                console.log(`"${dbname}" database server running at ${this.config.url}`);
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

            io.sockets.on("connection", socket => {
                clients.add(socket.id);
                console.log(`New client connected, total: ${clients.list.length}`);
                //socket.emit("welcome");

                socket.on("disconnect", data => {
                    // We lost one
                    const client = clients.get(socket.id);
                    if (client.subscriptions.length > 0) {
                        let remove = [];
                        Object.keys(client.subscriptions).forEach(path => {
                            remove.push(...client.subscriptions[path]);
                        })
                        remove.forEach(subscr => {
                            // Unsubscribe them at db level and remove from our list
                            db.ref(data.path).off(subscr.event, subscr.callback);
                            pathSubs.splice(pathSubs.indexOf(subscr), 1);
                        });
                    }
                    clients.remove(client);
                    console.log(`Socket disconnected, total: ${clients.list.length}`);
                });

                // socket.on("signin", data => {
                //     const client = clients.get(socket.id);
                //     client.user = null;
                //     checkLogin(data.username, data.password, (err, user, info) => {
                //         if (user) {
                //             client.user = user;
                //             socket.emit("signin-result", { success: true });
                //         }
                //         else {
                //             socket.emit("signin-result", { success: false });
                //         }
                //     });
                // });

                socket.on("signin", accessToken => {
                    const client = clients.get(socket.id);
                    client.user = _authCache.get(accessToken) || null;
                });

                socket.on("signout", data => {
                    const client = clients.get(socket.id);
                    client.user = null;
                });

                const getUserFromToken = (token) => {
                    let userPromise = Promise.resolve(null);
                    if (this.config.authentication.enabled) {
                        if (!token) {
                            userPromise = Promise.reject(new AccessDeniedError(`no_access_token`));
                        }
                        let user = _authCache.get(token);
                        if (user) {
                            userPromise = Promise.resolve(user);
                        }
                        else {
                            userPromise = authRef.query().where('access_token', '==', token).get()
                            .then(snaps => {
                                if (snaps.length === 0 || snaps.length > 1) {
                                    throw new AccessDeniedError(`invalid_access_token`);
                                }
                                let user = snaps[0].val();
                                return user;
                            });
                        }
                    } 
                    return userPromise;
                }

                socket.on("subscribe", data => {
                    // Client wants to subscribe to events on a node
                    const subscriptionPath = data.path;

                    // Get client

                    // return getUserFromToken(data.access_token)
                    // .then(user => {
                    const client = clients.get(socket.id);

                    if (!userHasAccess(client.user, subscriptionPath, false)) {
                        socket.emit('subscribe-result', {
                            success: false,
                            reason: `access_denied`,
                            req_id: data.req_id
                        });
                        return;
                    }

                    const callback = (err, path, currentValue, previousValue) => {
                        if (!userHasAccess(client.user, subscriptionPath, false)) {
                            socket.emit('subscribe-result', {
                                success: false,
                                reason: `access_denied`,
                                req_id: data.req_id
                            });
                            return;
                        }
                        if (err) {
                            return;
                        }
                        let val = transport.serialize({
                            current: currentValue,
                            previous: previousValue
                        });
                        console.log(`Sending data event "${data.event}" for path "/${data.path}" to client ${socket.id}`);
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

                    db.api.subscribe(db.ref(subscriptionPath), data.event, callback);

                    // Send acknowledgement
                    socket.emit('subscribe-result', {
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
                        db.api.unsubscribe(db.ref(data.path), subscr.event, subscr.callback);
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
                        const ref = db.ref(tx.path);
                        db.api.transaction(ref, val => {
                            console.log(`Transaction ${tx.id} started with value: `, val);
                            const currentValue = transport.serialize(val);
                            const promise = new Promise((resolve) => {
                                tx.finish = resolve;
                            });
                            socket.emit("tx_started", { id: tx.id, value: currentValue }); // what if message is dropped? We should implement an ack/retry mechanism
                            return promise;
                        })
                        .then(res => {
                            console.log(`Transaction ${tx.id} finished`);
                            socket.emit("tx_completed", { id: tx.id });
                        });
                    }

                    if (data.action === "finish") {
                        // Finish transaction
                        // TODO: check what happens if undefined is returned
                        const tx = client.transactions[data.id];
                        delete client.transactions[data.id];

                        getUserFromToken(data.access_token)
                        .then(user => {
                            if (!tx) {
                                throw new Error(`Can't finish unknown transaction with id: ${data.id}`);
                            }
                            if (!userHasAccess(user, data.path, true)) {
                                throw new AccessDeniedError(`access_denied`);
                            }

                            const newValue = transport.deserialize(data.value);
                            return tx.finish(newValue);
                        })
                        .catch(err => {
                            tx.finish(); // Finish with undefined, canceling the transaction
                            socket.emit('error', {
                                reason: err instanceof AccessDeniedError ? err.message : 'internal_error',
                                source: 'transaction',
                                data
                            });
                        });
                    }

                });

            });
        });
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