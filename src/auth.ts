import { ColorStyle, SimpleCache } from 'acebase-core';
import { randomBytes } from 'crypto';
import { DbUserAccountDetails } from './schema/user';
import { RouteInitEnvironment } from './shared/env';
import { createPasswordHash, generatePassword, getOldPasswordHash, getPasswordHash } from './shared/password';

export const setupAuthentication = async (env: RouteInitEnvironment) => {

    // Setup auth cache
    env.authCache = new SimpleCache<string, DbUserAccountDetails>({ expirySeconds: 300, cloneValues: false, maxEntries: 1000 });

    // Get or generate a salt to hash public tokens with
    await env.securityRef.child('token_salt').transaction(snap => {
        env.tokenSalt = snap.val();
        if (!env.tokenSalt) {
            const length = 256;
            env.tokenSalt = randomBytes(Math.ceil(length/2)).toString('hex').slice(0,length);
            return env.tokenSalt;
        }
    });

    // Setup admin account
    await env.authRef.child('admin').transaction(snap => {

        let adminAccount: DbUserAccountDetails = snap.val();
        if (adminAccount === null) {
            // Use provided default password, or generate one:
            const adminPassword = env.config.auth.defaultAdminPassword || generatePassword();

            const pwd = createPasswordHash(adminPassword);
            adminAccount = {
                uid: null,
                username: 'admin',
                email: null, // no email address for admin
                display_name: `${env.db.name} AceBase admin`,
                password: pwd.hash,
                password_salt: pwd.salt,
                change_password: true,  // flags that password must be changed. Not implemented yet
                created: new Date(),
                access_token: null, // Will be set upon login, so bearer authentication strategy can find user with this token
                settings: {},
            };
            env.debug.warn(`__________________________________________________________________`.colorize(ColorStyle.red));
            env.debug.warn(``.colorize(ColorStyle.red));
            env.debug.warn(`IMPORTANT: Admin account created`.colorize(ColorStyle.red));
            env.debug.warn(`You need the admin account to remotely administer the database`.colorize(ColorStyle.red));
            env.debug.warn(`Use the following credentials to authenticate an AceBaseClient:`.colorize(ColorStyle.red));
            env.debug.warn(``);
            env.debug.warn(`    username: admin`.colorize(ColorStyle.red));
            env.debug.warn(`    password: ${adminPassword}`.colorize(ColorStyle.red));
            env.debug.warn(``);
            env.debug.warn(`THIS IS ONLY SHOWN ONCE!`.colorize(ColorStyle.red));
            env.debug.warn(`__________________________________________________________________`.colorize(ColorStyle.red));
            return adminAccount; // Save it
        }
        else if (env.config.auth.defaultAdminPassword) {
            // Check if the default password was changed
            let passwordHash;
            if (!adminAccount.password_salt) {
                // Old md5 password hash?
                passwordHash = getOldPasswordHash(env.config.auth.defaultAdminPassword);
            }
            else {
                passwordHash = getPasswordHash(env.config.auth.defaultAdminPassword, adminAccount.password_salt);
            }
            if (adminAccount.password === passwordHash) {
                env.debug.warn(`WARNING: default password for admin user was not changed!`.colorize(ColorStyle.red));

                if (!adminAccount.password_salt) {
                    // Create new password hash
                    const pwd = createPasswordHash(env.config.auth.defaultAdminPassword);
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

export default setupAuthentication;
