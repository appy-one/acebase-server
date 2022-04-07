"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = exports.UpdateError = void 0;
const user_1 = require("../schema/user");
const validate_1 = require("../shared/validate");
const error_1 = require("../shared/error");
class UpdateError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.UpdateError = UpdateError;
const addRoute = (env) => {
    env.app.post(`/auth/${env.db.name}/update`, async (req, res) => {
        let details = req.body;
        if (!req.user) {
            env.logRef.push({ action: 'update', success: false, code: 'unauthenticated_update', update_uid: details.uid, ip: req.ip, date: new Date() });
            return error_1.sendNotAuthenticatedError(res, 'unauthenticated_update', 'Sign in to change details');
        }
        const uid = details.uid || req.user.uid;
        if (req.user.uid !== 'admin' && (uid !== req.user.uid || typeof details.is_disabled === 'boolean')) {
            env.logRef.push({ action: 'update', success: false, code: 'unauthorized_update', auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });
            return error_1.sendUnauthorizedError(res, 'unauthorized_update', 'You are not authorized to perform this update. This attempt has been logged.');
        }
        if (typeof details.display_name === 'undefined' && typeof details.displayName === 'string') {
            // Allow displayName to be sent also (which is used in signup endpoint)
            details.display_name = details.displayName;
        }
        // Check if sent details are ok
        let err;
        if (details.email && !validate_1.isValidEmail(details.email)) {
            err = validate_1.invalidEmailError;
        }
        else if (details.email && !await validate_1.isValidNewEmailAddress(env.authRef, details.email)) {
            err = validate_1.emailExistsError;
        }
        else if (details.username && !validate_1.isValidUsername(details.username)) {
            err = validate_1.invalidUsernameError;
        }
        else if (details.username && !await validate_1.isValidNewUsername(env.authRef, details.username)) {
            err = validate_1.usernameExistsError;
        }
        else if (details.display_name && !validate_1.isValidDisplayName(details.display_name)) {
            err = validate_1.invalidDisplayNameError;
        }
        else if (details.picture && !validate_1.isValidPicture(details.picture)) {
            err = validate_1.invalidPictureError;
        }
        else if (!validate_1.isValidSettings(details.settings)) {
            err = validate_1.invalidSettingsError;
        }
        if (err) {
            // Log failure
            env.logRef.push({ action: 'update', success: false, code: err.code, auth_uid: req.user.uid, update_uid: uid, ip: req.ip, date: new Date() });
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
                    if (!validate_1.isValidSettings(user.settings)) {
                        err = validate_1.invalidSettingsError;
                        env.logRef.push({ action: 'update', success: false, code: 'too_many_settings', auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });
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
            res.send({ user: user_1.getPublicAccountDetails(user) });
        }
        catch (err) {
            // All known errors except user_not_found will have been sent already
            if (err.code === 'user_not_found') {
                env.logRef.push({ action: 'update', success: false, code: err.code, auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });
                res.statusCode = 404; // Not Found
                res.send(err);
            }
            else {
                // Unexpected
                env.logRef.push({ action: 'update', success: false, code: err.code || 'unexpected', message: err.message, auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });
                error_1.sendUnexpectedError(res, err);
            }
        }
    });
};
exports.addRoute = addRoute;
//# sourceMappingURL=auth-update.js.map