import { RouteInitEnvironment, RouteRequest } from './shared/env';
import { sendNotAuthenticatedError, sendUnauthorizedError, sendUnexpectedError } from './shared/error';

export class DeleteError extends Error { 
    constructor(public code: 'unauthenticated_delete'|'unauthorized_delete', message: string) {
        super(message);
    }
}

export type RequestQuery = {};
export type RequestBody = { uid: string };
export type ResponseBody = 'Farewell' | { code: DeleteError['code']; message: string };
export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

export const addRoute = (env: RouteInitEnvironment) => {
    env.app.post(`/auth/${env.db.name}/delete`, async (req: Request, res) => {
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