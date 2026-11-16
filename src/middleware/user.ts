import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendNotAuthenticatedError } from '../shared/error';
import { signIn } from '../shared/signin';
import { decodePublicAccessToken, PublicAccessToken } from '../shared/tokens';

export const addMiddleware = (env: RouteInitEnvironment) => {
    // Add bearer authentication middleware
    env.router.use(async (req: RouteRequest<{ auth_token?: string }>, res, next) => {
        let authorization = req.get('Authorization');
        if (typeof authorization !== 'string' && 'auth_token' in req.query) {
            // Enables browser calls to be authenticated by adding the access token as auth_token query parameter
            if (req.path.startsWith('/export/') || req.path.startsWith('/logs')) {
                // For now, only allow '/export' or '/logs' api calls
                // In the future, use these prerequisites:
                // - user must be currently authenticated (in cache)
                // - ip address must match the token
                authorization = 'Bearer ' + req.query.auth_token;
            }
        }

        if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
            const token = authorization.slice(7);
            let tokenDetails: PublicAccessToken;
            try {
                tokenDetails = decodePublicAccessToken(token, env.tokenSalt);
            }
            catch (err) {
                return sendNotAuthenticatedError(res, 'invalid_token', 'Access token is invalid. Sign in again');
            }

            try {
                // Query database to get user for this token, assign to request
                req.user = await signIn(
                    { method: 'token', uid: tokenDetails.uid, access_token: tokenDetails.access_token },
                    env,
                    req.ip,
                );
            }
            catch (err: any) {
                return sendNotAuthenticatedError(res, err.code, err.message);
            }
        }
        next();
    });
};

export default addMiddleware;
