"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    env.app.post(`/auth/${env.db.name}/update`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const details = req.body;
        const LOG_ACTION = 'auth.update';
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null, update_uid: (_c = details.uid) !== null && _c !== void 0 ? _c : null };
        if (!req.user) {
            env.log.error(LOG_ACTION, 'unauthenticated_update', LOG_DETAILS);
            return (0, error_1.sendNotAuthenticatedError)(res, 'unauthenticated_update', 'Sign in to change details');
        }
        const uid = details.uid || req.user.uid;
        if (req.user.uid !== 'admin' && (uid !== req.user.uid || typeof details.is_disabled === 'boolean')) {
            env.log.error(LOG_ACTION, 'unauthorized_update', LOG_DETAILS);
            return (0, error_1.sendUnauthorizedError)(res, 'unauthorized_update', 'You are not authorized to perform this update. This attempt has been logged.');
        }
        if (typeof details.display_name === 'undefined' && typeof details.displayName === 'string') {
            // Allow displayName to be sent also (which is used in signup endpoint)
            details.display_name = details.displayName;
        }
        // Check if sent details are ok
        let err;
        if (details.email && !(0, validate_1.isValidEmail)(details.email)) {
            err = validate_1.invalidEmailError;
        }
        else if (details.email && !(yield (0, validate_1.isValidNewEmailAddress)(env.authRef, details.email))) {
            err = validate_1.emailExistsError;
        }
        else if (details.username && !(0, validate_1.isValidUsername)(details.username)) {
            err = validate_1.invalidUsernameError;
        }
        else if (details.username && !(yield (0, validate_1.isValidNewUsername)(env.authRef, details.username))) {
            err = validate_1.usernameExistsError;
        }
        else if (details.display_name && !(0, validate_1.isValidDisplayName)(details.display_name)) {
            err = validate_1.invalidDisplayNameError;
        }
        else if (details.picture && !(0, validate_1.isValidPicture)(details.picture)) {
            err = validate_1.invalidPictureError;
        }
        else if (!(0, validate_1.isValidSettings)(details.settings)) {
            err = validate_1.invalidSettingsError;
        }
        if (err) {
            // Log failure
            env.log.error(LOG_ACTION, err.code, LOG_DETAILS);
            res.status(422).send(err); // Unprocessable Entity
            return;
        }
        try {
            let user;
            yield env.authRef.child(uid).transaction(snap => {
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
                    if (!(0, validate_1.isValidSettings)(user.settings)) {
                        err = validate_1.invalidSettingsError;
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
            res.send({ user: (0, user_1.getPublicAccountDetails)(user) });
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
                env.log.error(LOG_ACTION, (_d = err.code) !== null && _d !== void 0 ? _d : 'unexpected', LOG_DETAILS, err);
                (0, error_1.sendUnexpectedError)(res, err);
            }
        }
    }));
};
exports.addRoute = addRoute;
//# sourceMappingURL=auth-update.js.map