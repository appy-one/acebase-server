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
exports.addRoute = exports.ResetPasswordError = void 0;
const tokens_1 = require("../shared/tokens");
const error_1 = require("../shared/error");
const password_1 = require("../shared/password");
class ResetPasswordError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.ResetPasswordError = ResetPasswordError;
/**
 * Adds the reset_password route and returns the reset function that can be used to manually reset a password
 * @param env environment
 * @returns returns the reset function
 */
const addRoute = (env) => {
    const resetPassword = (clientIp, code, newPassword) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            var verification = (0, tokens_1.parseSignedPublicToken)(code, env.tokenSalt);
        }
        catch (err) {
            throw new ResetPasswordError('invalid_code', err.message);
        }
        const snap = yield env.authRef.child(verification.uid).get();
        if (!snap.exists()) {
            throw new ResetPasswordError('unknown_user', 'Uknown user');
        }
        const user = snap.val();
        user.uid = snap.key;
        if (user.password_reset_code !== verification.code) {
            throw new ResetPasswordError('invalid_code', 'Invalid code');
        }
        if (newPassword.length < 8 || newPassword.includes(' ')) {
            throw new ResetPasswordError('password_requirement_mismatch', 'Password must be at least 8 characters, and cannot contain spaces');
        }
        // Ok to change password
        const pwd = (0, password_1.createPasswordHash)(newPassword);
        yield snap.ref.update({
            password: pwd.hash,
            password_salt: pwd.salt,
            password_reset_code: null
        });
        // Send confirmation email
        const request = {
            type: 'user_reset_password_success',
            date: new Date(),
            ip: clientIp,
            user: {
                uid: user.uid,
                email: user.email,
                username: user.username,
                displayName: user.display_name,
                settings: user.settings
            }
        };
        (_a = env.config.email) === null || _a === void 0 ? void 0 : _a.send(request);
        return user;
    });
    env.app.post(`/auth/${env.db.name}/reset_password`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _b, _c, _d, _e;
        const details = req.body;
        const LOG_ACTION = 'auth.reset_password';
        const LOG_DETAILS = { ip: req.ip, uid: (_c = (_b = req.user) === null || _b === void 0 ? void 0 : _b.uid) !== null && _c !== void 0 ? _c : null };
        try {
            const user = yield resetPassword(req.ip, details.code, details.password);
            env.log.event(LOG_ACTION, Object.assign(Object.assign({}, LOG_DETAILS), { reset_uid: user.uid }));
            res.send('OK');
        }
        catch (err) {
            env.log.error(LOG_ACTION, (_d = err.code) !== null && _d !== void 0 ? _d : 'unexpected', Object.assign(Object.assign({}, LOG_DETAILS), { message: (_e = (err instanceof Error && err.message)) !== null && _e !== void 0 ? _e : err.toString() }));
            if (err.code) {
                (0, error_1.sendBadRequestError)(res, err);
            }
            else {
                (0, error_1.sendUnexpectedError)(res, err);
            }
        }
    }));
    return resetPassword;
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=auth-reset-password.js.map