import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { DbUserAccountDetails } from '../schema/user';
import { parseSignedPublicToken } from '../shared/tokens';
import { sendBadRequestError, sendUnexpectedError } from '../shared/error';

export class VerifyEmailError extends Error { 
    constructor(public code: 'invalid_code'|'unknown_user', message: string) {
        super(message);
    }
}

export type RequestQuery = {};
export type RequestBody = { code: string };
export type ResponseBody = 'OK' | { code: string; message: string };
export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

/**
 * Adds the verify_email route and returns the verification function that can be used to manually verify an email address
 * @param env environment
 * @returns returns the verification function
 */
export const addRoute = (env: RouteInitEnvironment) => {

    const verifyEmailAddress = async (clientIp: string, code: string) => {
        try {
            var verification = parseSignedPublicToken(code, env.tokenSalt);
        }
        catch (err) {
            throw new VerifyEmailError('invalid_code', err.message);
        }

        const snap = await env.authRef.child(verification.uid).get();
        if (!snap.exists()) { 
            throw new VerifyEmailError('unknown_user', 'Unknown user');
        }
        const user: DbUserAccountDetails = snap.val();
        user.uid = snap.key as string;

        // No need to do further checks, code was signed by us so we can trust the contents
        // Mark account as verified
        await snap.ref.update({ email_verified: true });

        env.logRef.push({ action: 'verify_email', success: true, ip: clientIp, date: new Date(), uid: user.uid });
    };

    env.app.post(`/auth/${env.db.name}/verify_email`, async (req: Request, res) => {

        const details = req.body;
        try {
            await verifyEmailAddress(req.ip, details.code);
            res.send('OK');
        }
        catch (err) {
            env.logRef.push({ action: 'verify_email', success: false, code: err.code, message: err.message, ip: req.ip, date: new Date(), uid: req.user?.uid ?? null });
            if (err.code) {
                sendBadRequestError(res, err);
            }
            else {
                sendUnexpectedError(res, err);
            }
        }
    });

    return verifyEmailAddress;
};

export default addRoute;