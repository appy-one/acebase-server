import { sendNotAuthenticatedError, sendUnauthorizedError, sendUnexpectedError } from '../shared/error.js';
export class DeleteError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
export const addRoute = (env) => {
    env.app.post(`/auth/${env.db.name}/delete`, async (req, res) => {
        let details = req.body;
        if (!req.user) {
            env.logRef.push({ action: 'delete', success: false, code: 'unauthenticated_delete', delete_uid: details.uid, ip: req.ip, date: new Date() });
            return sendNotAuthenticatedError(res, 'unauthenticated_delete', 'You are not authorized to perform this operation, your attempt has been logged');
        }
        if (req.user.uid !== 'admin' && details.uid !== req.user.uid) {
            env.logRef.push({ action: 'delete', success: false, code: 'unauthorized_delete', auth_uid: req.user.uid, delete_uid: details.uid, ip: req.ip, date: new Date() });
            return sendUnauthorizedError(res, 'unauthorized_delete', 'You are not authorized to perform this operation, your attempt has been logged');
        }
        const uid = details.uid ?? req.user.uid;
        if (uid === 'admin') {
            env.logRef.push({ action: 'delete', success: false, code: 'unauthorized_delete', auth_uid: req.user.uid, delete_uid: details.uid, ip: req.ip, date: new Date() });
            return sendUnauthorizedError(res, 'unauthorized_delete', 'The admin account cannot be deleted, your attempt has been logged');
        }
        try {
            await env.authRef.child(uid).remove();
            env.logRef.push({ action: 'delete', success: true, auth_uid: req.user.uid, delete_uid: details.uid, ip: req.ip, date: new Date() });
            res.send('Farewell');
        }
        catch (err) {
            env.logRef.push({ action: 'delete', success: false, code: 'unexpected', auth_uid: req.user.uid, delete_uid: details.uid, ip: req.ip, date: new Date() });
            sendUnexpectedError(res, err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=auth-delete.js.map