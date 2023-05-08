import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { DbUserAccountDetails } from '../schema/user';
import { parseSignedPublicToken } from '../shared/tokens';
import { sendBadRequestError, sendUnexpectedError } from '../shared/error';

export class VerifyEmailError extends Error {
    constructor(public code: 'invalid_code'|'unknown_user', message: string) {
        super(message);
    }
}

export type RequestQuery = never;
export type RequestBody = { code: string };
export type ResponseBody = 'OK' | { code: string; message: string };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

/**
 * Adds the verify_email route and returns the verification function that can be used to manually verify an email address
 * @param env environment
 * @returns returns the verification function
 */
export const addRoute = (env: RouteInitEnvironment) => {

    const LOG_ACTION = 'auth.verify_email';

    const verifyEmailAddress = async (clientIp: string, code: string) => {

        const LOG_DETAILS = { ip: clientIp, uid: null };

        const verification = (() => {
            try {
                return parseSignedPublicToken(code, env.tokenSalt);
            }
            catch (err) {
                throw new VerifyEmailError('invalid_code', err.message);
            }
        })();

        LOG_DETAILS.uid = verification.uid;
        const snap = await env.authRef.child(verification.uid).get();
        if (!snap.exists()) {
            env.log.error(LOG_ACTION, 'unknown_user', LOG_DETAILS);
            throw new VerifyEmailError('unknown_user', 'Unknown user');
        }
        const user: DbUserAccountDetails = snap.val();
        user.uid = snap.key as string;

        // No need to do further checks, code was signed by us so we can trust the contents
        // Mark account as verified
        await snap.ref.update({ email_verified: true });

        env.log.event(LOG_ACTION, LOG_DETAILS);
    };

    env.router.post(`/auth/${env.db.name}/verify_email`, async (req: Request, res) => {

        const details = req.body;

        try {
            await verifyEmailAddress(req.ip, details.code);
            res.send('OK');
        }
        catch (err) {
            if (err.code) {
                sendBadRequestError(res, err);
            }
            else {
                env.log.error(LOG_ACTION, 'unexpected', { ip: req.ip, message: err.message, verificaion_code: details.code });
                sendUnexpectedError(res, err);
            }
        }
    });

    return verifyEmailAddress;
};

export default addRoute;
