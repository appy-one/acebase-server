import { getPublicAccountDetails } from '../schema/user.js';
import { emailExistsError, invalidDisplayNameError, invalidEmailError, invalidPictureError, invalidSettingsError, invalidUsernameError, isValidDisplayName, isValidEmail, isValidNewEmailAddress, isValidNewUsername, isValidPicture, isValidSettings, isValidUsername, usernameExistsError } from '../shared/validate.js';
import { sendNotAuthenticatedError, sendUnauthorizedError, sendUnexpectedError } from '../shared/error.js';
export class UpdateError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
export const addRoute = (env) => {
    env.router.post(`/auth/${env.db.name}/update`, async (req, res) => {
        const details = req.body;
        const LOG_ACTION = 'auth.update';
        const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null, update_uid: details.uid ?? null };
        if (!req.user) {
            env.log.error(LOG_ACTION, 'unauthenticated_update', LOG_DETAILS);
            return sendNotAuthenticatedError(res, 'unauthenticated_update', 'Sign in to change details');
        }
        const uid = details.uid || req.user.uid;
        if (req.user.uid !== 'admin' && (uid !== req.user.uid || typeof details.is_disabled === 'boolean')) {
            env.log.error(LOG_ACTION, 'unauthorized_update', LOG_DETAILS);
            return sendUnauthorizedError(res, 'unauthorized_update', 'You are not authorized to perform this update. This attempt has been logged.');
        }
        if (typeof details.display_name === 'undefined' && typeof details.displayName === 'string') {
            // Allow displayName to be sent also (which is used in signup endpoint)
            details.display_name = details.displayName;
        }
        // Check if sent details are ok
        let err;
        if (details.email && !isValidEmail(details.email)) {
            err = invalidEmailError;
        }
        else if (details.email && !await isValidNewEmailAddress(env.authRef, details.email)) {
            err = emailExistsError;
        }
        else if (details.username && !isValidUsername(details.username)) {
            err = invalidUsernameError;
        }
        else if (details.username && !await isValidNewUsername(env.authRef, details.username)) {
            err = usernameExistsError;
        }
        else if (details.display_name && !isValidDisplayName(details.display_name)) {
            err = invalidDisplayNameError;
        }
        else if (details.picture && !isValidPicture(details.picture)) {
            err = invalidPictureError;
        }
        else if (!isValidSettings(details.settings)) {
            err = invalidSettingsError;
        }
        if (err) {
            // Log failure
            env.log.error(LOG_ACTION, err.code, LOG_DETAILS);
            res.status(422).send(err); // Unprocessable Entity
            return;
        }
        try {
            let user;
            await env.authRef.child(uid).transaction(snap => {
                if (!snap.exists()) {
                    throw new UpdateError('user_not_found', `No user found with uid ${uid}`);
                }
                user = snap.val();
                if (details.email && details.email !== user.email) {
                    user.email = details.email;
                    user.email_verified = false; // TODO: send verification email
                }
                if (details.username) {
                    user.username = details.username;
                }
                if (details.display_name) {
                    user.display_name = details.display_name;
                }
                if (details.picture) {
                    user.picture = details.picture;
                }
                if (details.settings) {
                    if (typeof user.settings !== 'object') {
                        user.settings = {};
                    }
                    Object.keys(details.settings).forEach(key => {
                        user.settings[key] = details.settings[key];
                    });
                    if (!isValidSettings(user.settings)) {
                        err = invalidSettingsError;
                        env.log.error(LOG_ACTION, 'too_many_settings', LOG_DETAILS);
                        res.statusCode = 422; // Unprocessable Entity
                        res.send(err);
                        return;
                    }
                }
                if (typeof details.is_disabled === 'boolean') {
                    user.is_disabled = details.is_disabled;
                }
                return user; // Update db user
            });
            // Update cache
            env.authCache.set(user.uid, user);
            // Send merged results back
            res.send({ user: getPublicAccountDetails(user) });
        }
        catch (err) {
            // All known errors except user_not_found will have been sent already
            if (err.code === 'user_not_found') {
                env.log.error(LOG_ACTION, err.code, LOG_DETAILS);
                res.statusCode = 404; // Not Found
                res.send(err);
            }
            else {
                // Unexpected
                env.log.error(LOG_ACTION, err.code ?? 'unexpected', LOG_DETAILS, err);
                sendUnexpectedError(res, err);
            }
        }
    });
};
//# sourceMappingURL=auth-update.js.map