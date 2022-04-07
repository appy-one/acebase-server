"use strict";
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
    const resetPassword = async (clientIp, code, newPassword) => {
        var _a;
        try {
            var verification = tokens_1.parseSignedPublicToken(code, env.tokenSalt);
        }
        catch (err) {
            throw new ResetPasswordError('invalid_code', err.message);
        }
        const snap = await env.authRef.child(verification.uid).get();
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
        const pwd = password_1.createPasswordHash(newPassword);
        await snap.ref.update({
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
    };
    env.app.post(`/auth/${env.db.name}/reset_password`, async (req, res) => {
        var _a, _b;
        const details = req.body;
        try {
            const user = await resetPassword(req.ip, details.code, details.password);
            env.logRef.push({ action: 'reset_password', success: true, ip: req.ip, date: new Date(), uid: user.uid });
            res.send('OK');
        }
        catch (err) {
            env.logRef.push({ action: 'reset_password', success: false, code: err.code, message: err.message, ip: req.ip, date: new Date(), uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null });
            if (err.code) {
                error_1.sendBadRequestError(res, err);
            }
            else {
                error_1.sendUnexpectedError(res, err);
            }
        }
    });
    return resetPassword;
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=auth-reset-password.js.map