import { sendNotAuthenticatedError, sendUnauthorizedError, sendUnexpectedError } from '../shared/error.js';
export class DeleteError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
export const addRoute = (env) => {
    env.app.post(`/auth/${env.db.name}/delete`, async (req, res) => {
        const details = req.body;
        const LOG_ACTION = 'auth.delete';
        const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null, delete_uid: details.uid };
        if (!req.user) {
            env.log.error(LOG_ACTION, 'unauthenticated_delete', LOG_DETAILS);
            return sendNotAuthenticatedError(res, 'unauthenticated_delete', 'You are not authorized to perform this operation, your attempt has been logged');
        }
        if (req.user.uid !== 'admin' && details.uid !== req.user.uid) {
            env.log.error(LOG_ACTION, 'unauthorized_delete', LOG_DETAILS);
            return sendUnauthorizedError(res, 'unauthorized_delete', 'You are not authorized to perform this operation, your attempt has been logged');
        }
        const uid = details.uid ?? req.user.uid;
        if (uid === 'admin') {
            env.log.error(LOG_ACTION, 'unauthorized_delete', LOG_DETAILS);
            return sendUnauthorizedError(res, 'unauthorized_delete', 'The admin account cannot be deleted, your attempt has been logged');
        }
        try {
            await env.authRef.child(uid).remove();
            env.log.event(LOG_ACTION, LOG_DETAILS);
            res.send('Farewell');
        }
        catch (err) {
            env.log.error(LOG_ACTION, 'unexpected', { ...LOG_DETAILS, message: (err instanceof Error && err.message) ?? err.toString() });
            sendUnexpectedError(res, err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=auth-delete.js.map