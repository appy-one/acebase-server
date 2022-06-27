import { sendBadRequestError, sendUnexpectedError } from '../shared/error.js';
import { createPasswordHash, getOldPasswordHash, getPasswordHash } from '../shared/password.js';
import { ID } from 'acebase-core';
import { createPublicAccessToken } from '../shared/tokens.js';
export class ChangePasswordError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
export const addRoute = (env) => {
    env.app.post(`/auth/${env.db.name}/change_password`, async (req, res) => {
        let access_token = req.user?.access_token;
        const details = req.body;
        const LOG_ACTION = 'auth.change_password';
        const LOG_DETAILS = { ip: req.ip, uid: details.uid ?? null };
        if (typeof details !== 'object' || typeof details.uid !== 'string' || typeof details.password !== 'string' || typeof details.new_password !== 'string') {
            env.log.error(LOG_ACTION, 'invalid_details', LOG_DETAILS);
            res.status(400).send('Bad Request'); // Bad Request
            return;
        }
        if (details.new_password.length < 8 || details.new_password.includes(' ') || !/[0-9]/.test(details.new_password) || !/[a-z]/.test(details.new_password) || !/[A-Z]/.test(details.new_password)) {
            env.log.error(LOG_ACTION, 'new_password_denied', LOG_DETAILS);
            const err = 'Invalid new password, must be at least 8 characters and contain a combination of numbers and letters (both lower and uppercase)';
            res.status(422).send(err); // Unprocessable Entity
            return;
        }
        try {
            let publicAccessToken;
            await env.authRef.child(details.uid).transaction(snap => {
                if (!snap.exists()) {
                    throw new ChangePasswordError('unknown_uid', `Unknown uid`);
                }
                let user = snap.val();
                user.uid = snap.key;
                let hash = user.password_salt ? getPasswordHash(details.password, user.password_salt) : getOldPasswordHash(details.password);
                if (user.password !== hash) {
                    throw new ChangePasswordError('wrong_password', `Wrong password`);
                }
                if (access_token && access_token !== user.access_token) {
                    throw new ChangePasswordError('wrong_access_token', `Cannot change password while signed in as other user, or with an old token`);
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
                env.authCache.set(user.uid, user);
                // Create new public access token
                publicAccessToken = createPublicAccessToken(user.uid, req.ip, user.access_token, env.tokenSalt);
                return user; // Update db
            });
            env.log.event(LOG_ACTION, LOG_DETAILS);
            res.send({ access_token: publicAccessToken }); // Client must use this new access token from now on
        }
        catch (err) {
            env.log.error(LOG_ACTION, err.code, LOG_DETAILS);
            if (err.code) {
                sendBadRequestError(res, err);
            }
            else {
                sendUnexpectedError(res, err);
            }
        }
    });
};
export default addRoute;
//# sourceMappingURL=auth-change-password.js.map