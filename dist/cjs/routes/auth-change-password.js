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
exports.addRoute = exports.ChangePasswordError = void 0;
const error_1 = require("../shared/error");
const password_1 = require("../shared/password");
const acebase_core_1 = require("acebase-core");
const tokens_1 = require("../shared/tokens");
class ChangePasswordError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.ChangePasswordError = ChangePasswordError;
const addRoute = (env) => {
    env.app.post(`/auth/${env.db.name}/change_password`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        let access_token = (_a = req.user) === null || _a === void 0 ? void 0 : _a.access_token;
        const details = req.body;
        if (typeof details !== 'object' || typeof details.uid !== 'string' || typeof details.password !== 'string' || typeof details.new_password !== 'string') {
            env.logRef.push({ action: 'change_password', success: false, code: 'invalid_details', ip: req.ip, date: new Date() });
            res.status(400).send('Bad Request'); // Bad Request
            return;
        }
        if (details.new_password.length < 8 || details.new_password.includes(' ') || !/[0-9]/.test(details.new_password) || !/[a-z]/.test(details.new_password) || !/[A-Z]/.test(details.new_password)) {
            env.logRef.push({ action: 'change_password', success: false, code: 'new_password_denied', ip: req.ip, date: new Date(), uid: details.uid });
            const err = 'Invalid new password, must be at least 8 characters and contain a combination of numbers and letters (both lower and uppercase)';
            res.status(422).send(err); // Unprocessable Entity
            return;
        }
        try {
            let publicAccessToken;
            yield env.authRef.child(details.uid).transaction(snap => {
                if (!snap.exists()) {
                    throw new ChangePasswordError('unknown_uid', `Unknown uid`);
                }
                let user = snap.val();
                user.uid = snap.key;
                let hash = user.password_salt ? (0, password_1.getPasswordHash)(details.password, user.password_salt) : (0, password_1.getOldPasswordHash)(details.password);
                if (user.password !== hash) {
                    throw new ChangePasswordError('wrong_password', `Wrong password`);
                }
                if (access_token && access_token !== user.access_token) {
                    throw new ChangePasswordError('wrong_access_token', `Cannot change password while signed in as other user, or with an old token`);
                }
                let pwd = (0, password_1.createPasswordHash)(details.new_password);
                const updates = {
                    access_token: acebase_core_1.ID.generate(),
                    access_token_created: new Date(),
                    password: pwd.hash,
                    password_salt: pwd.salt
                };
                // Update user object
                Object.assign(user, updates);
                // Set or update cache
                env.authCache.set(user.uid, user);
                // Create new public access token
                publicAccessToken = (0, tokens_1.createPublicAccessToken)(user.uid, req.ip, user.access_token, env.tokenSalt);
                return user; // Update db
            });
            res.send({ access_token: publicAccessToken }); // Client must use this new access token from now on
        }
        catch (err) {
            env.logRef.push({ action: 'change_pwd', success: false, code: err.code, ip: req.ip, date: new Date(), uid: details.uid });
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
//# sourceMappingURL=auth-change-password.js.map