import { getPublicAccountDetails } from '../schema/user.js';
import { sendNotAuthenticatedError, sendUnexpectedError } from '../shared/error.js';
import { createPublicAccessToken } from '../shared/tokens.js';
import { signIn } from '../shared/signin.js';
export const addRoute = (env) => {
    if (!env.config.auth.enabled) {
        throw new Error('Authentication not enabled in the server settings');
    }
    env.app.post(`/auth/${env.db.name}/signin`, async (req, res) => {
        const details = req.body;
        const clientId = details.client_id || null; // NEW in AceBaseClient v0.9.4
        try {
            const user = await signIn(details, env, req);
            if (typeof clientId === 'string' && env.clients.has(clientId)) {
                const client = env.clients.get(clientId);
                client.user = user; // Bind user to client socket
            }
            res.send({
                access_token: createPublicAccessToken(user.uid, req.ip, user.access_token, env.tokenSalt),
                user: getPublicAccountDetails(user),
            });
        }
        catch (err) {
            if (typeof err.code === 'string') {
                // Authentication error
                return sendNotAuthenticatedError(res, err.code, err.message);
            }
            // Unexpected error
            return sendUnexpectedError(res, err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=auth-signin.js.map