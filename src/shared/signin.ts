import { ID } from 'acebase-core';
import { DbUserAccountDetails } from '../schema/user';
import { RouteInitEnvironment } from './env';
import { createPasswordHash, getOldPasswordHash, getPasswordHash } from './password';

export type SignInCredentials =
    { method: 'token'; uid: string; access_token: string } |
    { method: 'email'; email: string; password: string } |
    { method: 'account', username: string, password: string };

export class SignInError extends Error {
    constructor(public code: string, message: string, public details: any = {}) {
        super(message);
    }
}

const queryUser = async (credentials: SignInCredentials, env: RouteInitEnvironment): Promise<DbUserAccountDetails> => {
    let user: DbUserAccountDetails | undefined;
    if (credentials.method === 'token') {
        // Uses the uid and access token extracted from a public access token
        if (typeof credentials.access_token !== 'string') {
            throw new SignInError('invalid_details', 'sign in request has invalid arguments');
        }
        const snap = await env.authRef.child(credentials.uid).get();
        if (snap.exists()) {
            user = snap.val() as DbUserAccountDetails;
            user.uid = snap.key;
        }
    }
    else {
        const query = env.authRef.query();
        switch (credentials.method) {
            case 'email': {
                if (typeof credentials.email !== 'string' || typeof credentials.password !== 'string') {
                    throw new SignInError('invalid_details', 'sign in request has invalid arguments');
                }
                query.filter('email', '==', credentials.email);
                break;
            }
            case 'account': {
                if (typeof credentials.username !== 'string' || typeof credentials.password !== 'string') {
                    throw new SignInError('invalid_details', 'sign in request has invalid arguments');
                }
                query.filter('username', '==', credentials.username);
                break;
            }
            default: {
                throw new SignInError('invalid_method', `Unsupported sign in method ${(credentials as any).method}`);
            }
        }

        const snaps = await query.get();
        if (snaps.length > 1) {
            throw new SignInError('duplicate', `${snaps.length} users found with the same ${credentials.method}. Contact your database administrator`, { count: snaps.length });
        }
        else if (snaps.length === 1) {
            const snap = snaps[0];
            user = snap.val() as DbUserAccountDetails;
            user.uid = snap.key;
        }
    }
    if (!user) {
        throw new SignInError('not_found', `account not found`);
    }
    return user;
};

/**
 * Signs in a user and logs the request. Uses cache for token sign-in method. If successful, adds the user to cache and returns the user details.
 * Throws a `SignInError` if sign in fails for a known reason.
 * @param credentials credentials to sign in the user with
 * @param env environment state
 * @param req current http request
 * @returns
 */
export const signIn = async (credentials: SignInCredentials, env: RouteInitEnvironment, ip: string, isNewSession: boolean): Promise<DbUserAccountDetails> => {
    const LOG_ACTION = 'auth.signin';
    const LOG_DETAILS = {
        ip,
        method: credentials.method,
        ...('uid' in credentials && { uid: credentials.uid }),
        ...('username' in credentials && { username: credentials.username }),
        ...('email' in credentials && { email: credentials.email }),
    };

    try {
        const isCached = credentials.method === 'token' && env.authCache.has(credentials.uid);
        const user = isCached
            ? env.authCache.get(credentials.uid)
            : await queryUser(credentials, env);

        if (credentials.method === 'token' && credentials.access_token !== user.access_token) {
            throw new SignInError('expired_token', `Access token has expired. Sign in again`);
        }
        if (user.is_disabled === true) {
            throw new SignInError('account_disabled', 'Your account has been disabled. Contact your database administrator');
        }
        if (credentials.method === 'account' || credentials.method === 'email') {
            // Check password
            const hash = user.password_salt ? getPasswordHash(credentials.password, user.password_salt) : getOldPasswordHash(credentials.password);
            if (user.password !== hash) {
                throw new SignInError('wrong_password', 'Incorrect password');
            }
        }

        if (isNewSession) {
            // Keep track of properties to update, both in db and cached details
            const updates: Partial<DbUserAccountDetails> = {
                last_session_start: new Date(),
                last_session_ip: ip,
                ...(credentials.method !== 'token' && {
                    // Update prev / last sign in stats
                    ...(user.last_signin && { prev_signin: user.last_signin }),
                    ...(user.last_signin_ip && { prev_signin_ip: user.last_signin_ip }),
                    last_signin: new Date(),
                    last_signin_ip: ip,
                }),
            };

            if ('password' in credentials) {
                if (!user.password_salt) {
                    // OLD md5 password hash, convert to new salted hash
                    const pwd = createPasswordHash(credentials.password);
                    updates.password = pwd.hash;
                    updates.password_salt = pwd.salt;
                }
                if (!user.access_token) {
                    // Generate access token
                    updates.access_token = ID.generate();
                    updates.access_token_created = new Date();
                }
            }

            // Update user object
            Object.assign(user, updates);

            // Update db
            await env.authRef.child(user.uid).update(updates);

            // Log history item
            if (!LOG_DETAILS.uid) {
                LOG_DETAILS.uid = user.uid;
            }
            env.log.event(LOG_ACTION, LOG_DETAILS).catch((err) => env.debug.fatal(`Failed to log successful sign in to db`, err));
        }

        // Update cache
        env.authCache.set(user.uid, user);

        return user;
    }
    catch (err: any) {
        // Log error
        env.log.error(LOG_ACTION, err?.code ?? 'unexpected', LOG_DETAILS, err?.code ?? err ?? null)
            .catch((err) => env.debug.fatal(`Failed to log failed sign in to db`, err));
        throw err;
    }
};
