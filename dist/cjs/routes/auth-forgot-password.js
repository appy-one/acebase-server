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
exports.addRoute = exports.ForgotPasswordError = void 0;
const tokens_1 = require("../shared/tokens");
const acebase_core_1 = require("acebase-core");
const error_1 = require("../shared/error");
class ForgotPasswordError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.ForgotPasswordError = ForgotPasswordError;
const addRoute = (env) => {
    env.app.post(`/auth/${env.db.name}/forgot_password`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        const details = req.body;
        const LOG_ACTION = 'auth.forgot_password';
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null, email: details.email };
        try {
            if (!env.config.email || typeof env.config.email.send !== 'function') {
                throw new ForgotPasswordError('server_email_config', 'Server email settings have not been configured');
            }
            if (typeof details !== 'object' || typeof details.email !== 'string' || details.email.length === 0) {
                throw new ForgotPasswordError('invalid_details', 'Invalid details');
            }
            const snaps = yield env.authRef.query().filter('email', '==', details.email).get();
            if (snaps.length !== 1) {
                throw new ForgotPasswordError('invalid_email', 'Email address not found, or duplicate entries found');
            }
            const snap = snaps[0];
            const user = snap.val();
            user.uid = snap.key;
            user.password_reset_code = acebase_core_1.ID.generate();
            // Request a password reset email to be sent:
            const request = {
                type: 'user_reset_password',
                date: new Date(),
                ip: req.ip,
                resetCode: (0, tokens_1.createSignedPublicToken)({ uid: user.uid, code: user.password_reset_code }, env.tokenSalt),
                user: {
                    email: user.email,
                    uid: user.uid,
                    username: user.username,
                    settings: user.settings,
                    displayName: user.display_name,
                },
            };
            yield snap.ref.update({ password_reset_code: user.password_reset_code });
            yield env.config.email.send(request).catch(err => {
                env.log.error(LOG_ACTION + '.email', 'unexpected', Object.assign(Object.assign({}, LOG_DETAILS), { request }), err);
            });
            env.log.event(LOG_ACTION, LOG_DETAILS);
            res.send('OK');
        }
        catch (err) {
            env.log.error(LOG_ACTION, err.code || 'unexpected', Object.assign(Object.assign({}, LOG_DETAILS), { message: (_c = (err instanceof Error && err.message)) !== null && _c !== void 0 ? _c : err.toString() }));
            if (err.code) {
                (0, error_1.sendBadRequestError)(res, err);
            }
            else {
                (0, error_1.sendUnexpectedError)(res, err);
            }
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=auth-forgot-password.js.map