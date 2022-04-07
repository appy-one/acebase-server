"use strict";
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
    env.app.post(`/auth/${env.db.name}/delete`, async (req, res) => {
        var _a;
        let details = req.body;
        if (!req.user) {
            env.logRef.push({ action: 'delete', success: false, code: 'unauthenticated_delete', delete_uid: details.uid, ip: req.ip, date: new Date() });
            return error_1.sendNotAuthenticatedError(res, 'unauthenticated_delete', 'You are not authorized to perform this operation, your attempt has been logged');
        }
        if (req.user.uid !== 'admin' && details.uid !== req.user.uid) {
            env.logRef.push({ action: 'delete', success: false, code: 'unauthorized_delete', auth_uid: req.user.uid, delete_uid: details.uid, ip: req.ip, date: new Date() });
            return error_1.sendUnauthorizedError(res, 'unauthorized_delete', 'You are not authorized to perform this operation, your attempt has been logged');
        }
        const uid = (_a = details.uid) !== null && _a !== void 0 ? _a : req.user.uid;
        if (uid === 'admin') {
            env.logRef.push({ action: 'delete', success: false, code: 'unauthorized_delete', auth_uid: req.user.uid, delete_uid: details.uid, ip: req.ip, date: new Date() });
            return error_1.sendUnauthorizedError(res, 'unauthorized_delete', 'The admin account cannot be deleted, your attempt has been logged');
        }
        try {
            await env.authRef.child(uid).remove();
            env.logRef.push({ action: 'delete', success: true, auth_uid: req.user.uid, delete_uid: details.uid, ip: req.ip, date: new Date() });
            res.send('Farewell');
        }
        catch (err) {
            env.logRef.push({ action: 'delete', success: false, code: 'unexpected', auth_uid: req.user.uid, delete_uid: details.uid, ip: req.ip, date: new Date() });
            error_1.sendUnexpectedError(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=auth-delete.js.map