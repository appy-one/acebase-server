"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAuthentication = void 0;
const acebase_core_1 = require("acebase-core");
const crypto_1 = require("crypto");
const password_1 = require("./shared/password");
const setupAuthentication = async (env) => {
    // Setup auth cache
    env.authCache = new acebase_core_1.SimpleCache({ expirySeconds: 300, cloneValues: false, maxEntries: 1000 });
    // Get or generate a salt to hash public tokens with
    await env.securityRef.child('token_salt').transaction(snap => {
        env.tokenSalt = snap.val();
        if (!env.tokenSalt) {
            let length = 256;
            env.tokenSalt = crypto_1.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
            return env.tokenSalt;
        }
    });
    // Setup admin account
    await env.authRef.child('admin').transaction(snap => {
        let adminAccount = snap.val();
        if (adminAccount === null) {
            // Use provided default password, or generate one:
            const adminPassword = env.config.auth.defaultAdminPassword || password_1.generatePassword();
            const pwd = password_1.createPasswordHash(adminPassword);
            adminAccount = {
                uid: null,
                username: 'admin',
                email: null,
                display_name: `${env.db.name} AceBase admin`,
                password: pwd.hash,
                password_salt: pwd.salt,
                change_password: true,
                created: new Date(),
                access_token: null,
                settings: {}
            };
            env.debug.warn(`__________________________________________________________________`.colorize(acebase_core_1.ColorStyle.red));
            env.debug.warn(``.colorize(acebase_core_1.ColorStyle.red));
            env.debug.warn(`IMPORTANT: Admin account created`.colorize(acebase_core_1.ColorStyle.red));
            env.debug.warn(`You need the admin account to remotely administer the database`.colorize(acebase_core_1.ColorStyle.red));
            env.debug.warn(`Use the following credentials to authenticate an AceBaseClient:`.colorize(acebase_core_1.ColorStyle.red));
            env.debug.warn(``);
            env.debug.warn(`    username: admin`.colorize(acebase_core_1.ColorStyle.red));
            env.debug.warn(`    password: ${adminPassword}`.colorize(acebase_core_1.ColorStyle.red));
            env.debug.warn(``);
            env.debug.warn(`THIS IS ONLY SHOWN ONCE!`.colorize(acebase_core_1.ColorStyle.red));
            env.debug.warn(`__________________________________________________________________`.colorize(acebase_core_1.ColorStyle.red));
            return adminAccount; // Save it
        }
        else if (env.config.auth.defaultAdminPassword) {
            // Check if the default password was changed
            let passwordHash;
            if (!adminAccount.password_salt) {
                // Old md5 password hash?
                passwordHash = password_1.getOldPasswordHash(env.config.auth.defaultAdminPassword);
            }
            else {
                passwordHash = password_1.getPasswordHash(env.config.auth.defaultAdminPassword, adminAccount.password_salt);
            }
            if (adminAccount.password === passwordHash) {
                env.debug.warn(`WARNING: default password for admin user was not changed!`.colorize(acebase_core_1.ColorStyle.red));
                if (!adminAccount.password_salt) {
                    // Create new password hash
                    const pwd = password_1.createPasswordHash(env.config.auth.defaultAdminPassword);
                    adminAccount.password = pwd.hash;
                    adminAccount.password_salt = pwd.salt;
                    return adminAccount; // Save it
                }
            }
        }
    });
    // Make sure indexes are present for quick user lookups
    env.authDb.indexes.create(env.authRef.path, 'username');
    env.authDb.indexes.create(env.authRef.path, 'email');
    env.authDb.indexes.create(env.authRef.path, 'access_token');
};
exports.setupAuthentication = setupAuthentication;
exports.default = exports.setupAuthentication;
//# sourceMappingURL=auth.js.map