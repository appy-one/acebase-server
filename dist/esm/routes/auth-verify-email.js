import { parseSignedPublicToken } from '../shared/tokens.js';
import { sendBadRequestError, sendUnexpectedError } from '../shared/error.js';
export class VerifyEmailError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
/**
 * Adds the verify_email route and returns the verification function that can be used to manually verify an email address
 * @param env environment
 * @returns returns the verification function
 */
export const addRoute = (env) => {
    const LOG_ACTION = 'auth.verify_email';
    const verifyEmailAddress = async (clientIp, code) => {
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
        const user = snap.val();
        user.uid = snap.key;
        // No need to do further checks, code was signed by us so we can trust the contents
        // Mark account as verified
        await snap.ref.update({ email_verified: true });
        env.log.event(LOG_ACTION, LOG_DETAILS);
    };
    env.app.post(`/auth/${env.db.name}/verify_email`, async (req, res) => {
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
//# sourceMappingURL=auth-verify-email.js.map