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
exports.addRoute = exports.VerifyEmailError = void 0;
const tokens_1 = require("../shared/tokens");
const error_1 = require("../shared/error");
class VerifyEmailError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.VerifyEmailError = VerifyEmailError;
/**
 * Adds the verify_email route and returns the verification function that can be used to manually verify an email address
 * @param env environment
 * @returns returns the verification function
 */
const addRoute = (env) => {
    const verifyEmailAddress = (clientIp, code) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            var verification = (0, tokens_1.parseSignedPublicToken)(code, env.tokenSalt);
        }
        catch (err) {
            throw new VerifyEmailError('invalid_code', err.message);
        }
        const snap = yield env.authRef.child(verification.uid).get();
        if (!snap.exists()) {
            throw new VerifyEmailError('unknown_user', 'Unknown user');
        }
        const user = snap.val();
        user.uid = snap.key;
        // No need to do further checks, code was signed by us so we can trust the contents
        // Mark account as verified
        yield snap.ref.update({ email_verified: true });
        env.logRef.push({ action: 'verify_email', success: true, ip: clientIp, date: new Date(), uid: user.uid });
    });
    env.app.post(`/auth/${env.db.name}/verify_email`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const details = req.body;
        try {
            yield verifyEmailAddress(req.ip, details.code);
            res.send('OK');
        }
        catch (err) {
            env.logRef.push({ action: 'verify_email', success: false, code: err.code, message: err.message, ip: req.ip, date: new Date(), uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null });
            if (err.code) {
                (0, error_1.sendBadRequestError)(res, err);
            }
            else {
                (0, error_1.sendUnexpectedError)(res, err);
            }
        }
    }));
    return verifyEmailAddress;
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=auth-verify-email.js.map