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
exports.addRoute = exports.DeleteError = void 0;
const error_1 = require("../shared/error");
class DeleteError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.DeleteError = DeleteError;
const addRoute = (env) => {
    env.app.post(`/auth/${env.db.name}/delete`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const details = req.body;
        const LOG_ACTION = 'auth.delete';
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null, delete_uid: details.uid };
        if (!req.user) {
            env.log.error(LOG_ACTION, 'unauthenticated_delete', LOG_DETAILS);
            return (0, error_1.sendNotAuthenticatedError)(res, 'unauthenticated_delete', 'You are not authorized to perform this operation, your attempt has been logged');
        }
        if (req.user.uid !== 'admin' && details.uid !== req.user.uid) {
            env.log.error(LOG_ACTION, 'unauthorized_delete', LOG_DETAILS);
            return (0, error_1.sendUnauthorizedError)(res, 'unauthorized_delete', 'You are not authorized to perform this operation, your attempt has been logged');
        }
        const uid = (_c = details.uid) !== null && _c !== void 0 ? _c : req.user.uid;
        if (uid === 'admin') {
            env.log.error(LOG_ACTION, 'unauthorized_delete', LOG_DETAILS);
            return (0, error_1.sendUnauthorizedError)(res, 'unauthorized_delete', 'The admin account cannot be deleted, your attempt has been logged');
        }
        try {
            yield env.authRef.child(uid).remove();
            env.log.event(LOG_ACTION, LOG_DETAILS);
            res.send('Farewell');
        }
        catch (err) {
            env.log.error(LOG_ACTION, 'unexpected', Object.assign(Object.assign({}, LOG_DETAILS), { message: (_d = (err instanceof Error && err.message)) !== null && _d !== void 0 ? _d : err.toString() }));
            (0, error_1.sendUnexpectedError)(res, err);
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=auth-delete.js.map