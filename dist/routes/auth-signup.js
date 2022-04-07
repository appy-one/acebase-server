"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = exports.SignupError = void 0;
const user_1 = require("../schema/user");
const validate_1 = require("../shared/validate");
const password_1 = require("../shared/password");
const acebase_core_1 = require("acebase-core");
const tokens_1 = require("../shared/tokens");
const error_1 = require("../shared/error");
class SignupError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.SignupError = SignupError;
const addRoute = (env) => {
    env.app.post(`/auth/${env.db.name}/signup`, async (req, res) => {
        var _a, _b, _c, _d, _e;
        if (!env.config.auth.allowUserSignup && (!req.user || req.user.username !== 'admin')) {
            env.logRef.push({ action: 'signup', success: false, code: 'user_signup_disabled', ip: req.ip, date: new Date() });
            res.statusCode = 403; // Forbidden
            return res.send({ code: 'admin_only', message: 'Only admin is allowed to create users' });
        }
        // Create user if it doesn't exist yet.
        // TODO: Rate-limit nr of signups per IP to prevent abuse
        const details = req.body;
        if (typeof details.display_name === 'string' && typeof details.displayName !== 'string') {
            // Allow display_name to be sent also (which is used in update endpoint)
            details.displayName = details.display_name;
        }
        // Check if sent details are ok
        let err;
        if (!details.username && !details.email) {
            err = { code: 'missing_details', message: 'No username or email provided' };
        }
        else if (details.email && !validate_1.isValidEmail(details.email)) {
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
        else if (!validate_1.isValidDisplayName(details.displayName)) {
            err = validate_1.invalidDisplayNameError;
        }
        else if (!validate_1.isValidPassword(details.password)) {
            err = validate_1.invalidPasswordError;
        }
        else if (!validate_1.isValidSettings(details.settings)) {
            err = validate_1.invalidSettingsError;
        }
        else if (details.picture && !validate_1.isValidPicture(details.picture)) {
            err = validate_1.invalidPictureError;
        }
        if (err === validate_1.emailExistsError || err === validate_1.usernameExistsError) {
            env.logRef.push({ action: 'signup', success: false, code: 'conflict', ip: req.ip, date: new Date(), username: details.username, email: details.email });
            res.statusCode = 409; // conflict
            return res.send(validate_1.emailOrUsernameExistsError);
        }
        else if (err) {
            // Log failure
            env.logRef.push({ action: 'signup', success: false, code: err.code, ip: req.ip, date: new Date() });
            res.statusCode = 422; // Unprocessable Entity
            return res.send(err);
        }
        try {
            // Ok, create user
            let pwd = password_1.createPasswordHash(details.password);
            const user = {
                uid: null,
                username: (_a = details.username) !== null && _a !== void 0 ? _a : null,
                email: (_b = details.email) !== null && _b !== void 0 ? _b : null,
                email_verified: false,
                display_name: details.displayName,
                password: pwd.hash,
                password_salt: pwd.salt,
                created: new Date(),
                created_ip: req.ip,
                access_token: acebase_core_1.ID.generate(),
                access_token_created: new Date(),
                last_signin: new Date(),
                last_signin_ip: req.ip,
                picture: (_c = details.picture) !== null && _c !== void 0 ? _c : null,
                settings: (_d = details.settings) !== null && _d !== void 0 ? _d : {}
            };
            const userRef = await env.authRef.push(user);
            user.uid = userRef.key;
            // Log success
            env.logRef.push({ action: 'signup', success: true, ip: req.ip, date: new Date(), uid: user.uid });
            // Cache the user
            env.authCache.set(user.uid, user);
            // Request welcome e-mail to be sent
            const request = {
                type: 'user_signup',
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
                activationCode: tokens_1.createSignedPublicToken({ uid: user.uid }, env.tokenSalt),
                emailVerified: false
            };
            (_e = env.config.email) === null || _e === void 0 ? void 0 : _e.send(request).catch(err => {
                env.logRef.push({ action: 'signup_email', success: false, code: 'unexpected', ip: req.ip, date: new Date(), error: err.message, request });
            });
            // Return the positive news
            const isAdmin = req.user && req.user.uid === 'admin';
            res.send({
                access_token: isAdmin ? '' : tokens_1.createPublicAccessToken(user.uid, req.ip, user.access_token, env.tokenSalt),
                user: user_1.getPublicAccountDetails(user)
            });
        }
        catch (err) {
            env.logRef.push({ action: 'signup', success: false, code: 'unexpected', ip: req.ip, date: new Date(), error: err.message, username: details.username, email: details.email });
            error_1.sendUnexpectedError(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=auth-signup.js.map