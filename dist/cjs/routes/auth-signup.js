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
    env.app.post(`/auth/${env.db.name}/signup`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const LOG_ACTION = 'auth.signup';
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null };
        if (!env.config.auth.allowUserSignup && (!req.user || req.user.username !== 'admin')) {
            env.log.error(LOG_ACTION, 'user_signup_disabled', LOG_DETAILS);
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
        else if (details.email && !(0, validate_1.isValidEmail)(details.email)) {
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
        else if (!(0, validate_1.isValidDisplayName)(details.displayName)) {
            err = validate_1.invalidDisplayNameError;
        }
        else if (!(0, validate_1.isValidPassword)(details.password)) {
            err = validate_1.invalidPasswordError;
        }
        else if (!(0, validate_1.isValidSettings)(details.settings)) {
            err = validate_1.invalidSettingsError;
        }
        else if (details.picture && !(0, validate_1.isValidPicture)(details.picture)) {
            err = validate_1.invalidPictureError;
        }
        if (err === validate_1.emailExistsError || err === validate_1.usernameExistsError) {
            env.log.error(LOG_ACTION, 'conflict', Object.assign(Object.assign({}, LOG_DETAILS), { username: details.username, email: details.email }));
            res.statusCode = 409; // conflict
            return res.send(validate_1.emailOrUsernameExistsError);
        }
        else if (err) {
            // Log failure
            env.log.error(LOG_ACTION, (_c = err.code) !== null && _c !== void 0 ? _c : 'unexpected', LOG_DETAILS);
            res.statusCode = 422; // Unprocessable Entity
            return res.send(err);
        }
        try {
            // Ok, create user
            let pwd = (0, password_1.createPasswordHash)(details.password);
            const user = {
                uid: null,
                username: (_d = details.username) !== null && _d !== void 0 ? _d : null,
                email: (_e = details.email) !== null && _e !== void 0 ? _e : null,
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
                picture: (_f = details.picture) !== null && _f !== void 0 ? _f : null,
                settings: (_g = details.settings) !== null && _g !== void 0 ? _g : {}
            };
            const userRef = yield env.authRef.push(user);
            user.uid = userRef.key;
            LOG_DETAILS.uid = user.uid;
            // Log success
            env.log.event(LOG_ACTION, LOG_DETAILS);
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
                activationCode: (0, tokens_1.createSignedPublicToken)({ uid: user.uid }, env.tokenSalt),
                emailVerified: false
            };
            (_h = env.config.email) === null || _h === void 0 ? void 0 : _h.send(request).catch(err => {
                env.log.error(LOG_ACTION + '.email', 'unexpected', Object.assign(Object.assign({}, LOG_DETAILS), { request }), err);
            });
            // Return the positive news
            const isAdmin = req.user && req.user.uid === 'admin';
            res.send({
                access_token: isAdmin ? '' : (0, tokens_1.createPublicAccessToken)(user.uid, req.ip, user.access_token, env.tokenSalt),
                user: (0, user_1.getPublicAccountDetails)(user)
            });
        }
        catch (err) {
            env.log.error(LOG_ACTION, 'unexpected', Object.assign(Object.assign({}, LOG_DETAILS), { message: err instanceof Error ? err.message : err.toString(), username: details.username, email: details.email }));
            (0, error_1.sendUnexpectedError)(res, err);
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=auth-signup.js.map