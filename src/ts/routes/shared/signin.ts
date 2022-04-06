import { ID } from "acebase-core";
import { DbUserAccountDetails } from "../schema/user";
import { RouteInitEnvironment, RouteRequest } from "./env";
import { createPasswordHash, getOldPasswordHash, getPasswordHash } from "./password";
import { decodePublicAccessToken } from "./tokens";

export type SignInCredentials = 
    { method: 'access_token'; access_token: string } | 
    { method: 'email'; email: string; password: string } |
    { method: 'account', username: string, password: string };

export class SignInError extends Error {
    constructor(public code: string, message: string, public details: Object = {}) {
        super(message);
    }
}

/**
 * Signs in a user and logs the request. If successful, adds the user to authCache, binds the user to the http request and returns the user details.
 * Throws a `SignInError` if sign in fails for a known reason.
 * @param credentials credentials to sign in the user with
 * @param env environment state
 * @param req current http request
 * @returns 
 */
export const signIn = async (credentials: SignInCredentials, env: RouteInitEnvironment, req: RouteRequest) => {
    try {
        const query = env.authRef.query();
        let tokenDetails: ReturnType<typeof decodePublicAccessToken>;
        switch (credentials.method) {
            case 'access_token': {
                try {
                    tokenDetails = decodePublicAccessToken(credentials.access_token, env.tokenSalt);
                    query.filter('access_token', '==', tokenDetails.access_token);
                }
                catch (err) {
                    throw new SignInError('invalid_token', err.message);
                }
                break;
            }
            case 'email': {
                query.filter('email', '==', credentials.email);
                break;
            }
            case 'account': {
                query.filter('username', '==', credentials.username);
                break;
            }
            default: {
                throw new SignInError('invalid_method', `Unsupported sign in method ${(credentials as any).method}`);
            }
        }

        const snaps = await query.get();
        if (snaps.length === 0) {
            throw new SignInError('not_found', `account not found`);
        }
        else if (snaps.length > 1) {
            throw new SignInError('duplicate', `${snaps.length} users found with the same ${credentials.method}. Contact your database administrator`, { count: snaps.length });
        }

        const snap = snaps[0];
        const user: DbUserAccountDetails = snap.val();
        user.uid = snap.key as string;

        if (user.is_disabled === true) {
            throw new SignInError('account_disabled', 'Your account has been disabled. Contact your database administrator');
        }
        if (credentials.method === 'access_token' && tokenDetails.uid !== user.uid) {
            throw new SignInError('token_mismatch', 'Sign in again');
        }
        if (credentials.method !== 'access_token') {
            let hash = user.password_salt ? getPasswordHash(credentials.password, user.password_salt) : getOldPasswordHash(credentials.password);
            if (user.password !== hash) {
                throw new SignInError('wrong_password', 'Incorrect password');
            }
        }

        // Keep track of properties to update, both in db and in our object
        const updates: Partial<DbUserAccountDetails> = {
            // Update prev / last sign in stats
            prev_signin: user.last_signin,
            prev_signin_ip: user.last_signin_ip,
            last_signin: new Date(),
            last_signin_ip: req.ip
        };
        
        if (credentials.method !== 'access_token') {
            if (!user.password_salt) {
                // OLD md5 password hash, convert to new salted hash
                let pwd = createPasswordHash(credentials.password);
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
        await snap.ref.update(updates);

        // Log history item
        env.logRef.push({ action: `signin`, type: credentials.method, [credentials.method]: credentials[credentials.method], ip: req.ip, date: new Date(), success: true });

        // Add to cache
        env.authCache.set(user.uid, user);

        // Bind user to current request
        req.user = user;

        return user;
    }
    catch (err) {
        // Log error
        env.logRef.push({ action: 'signin', type: credentials.method, [credentials.method]: credentials[credentials.method], success: false, code: err.code || 'unexpected', message: err.code ? null : err.message, ip: req.ip, date: new Date(), ...err.details });
        throw err;
    }
}