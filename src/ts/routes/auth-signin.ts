import { RouteInitEnvironment, RouteRequest } from './shared/env';
import { AceBaseUser, getPublicAccountDetails } from './schema/user';
import { sendNotAuthenticatedError, sendUnexpectedError } from './shared/error';
import { createPublicAccessToken, decodePublicAccessToken } from './shared/tokens';
import { signIn, SignInCredentials } from './shared/signin';
// import { clients } from './shared/clients';

export type RequestQuery = {};
export type RequestBody = { client_id?: string } & (
    { method: 'token'; access_token: string } | 
    { method: 'email'; email: string; password: string } |
    { method: 'username', username: string, password: string }
);
export type ResponseBody = {
    access_token: string; 
    user: AceBaseUser 
};

export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

export const addRoute = (env: RouteInitEnvironment) => {
    if (!env.settings.authentication.enabled) {
        throw new Error('Authentication not enabled in the server settings');
    }

    env.app.post(`/auth/${env.db.name}/signin`, async (req: Request, res) => {

        const details = req.body;
        const clientId = details.client_id || null;  // NEW in AceBaseClient v0.9.4

        try {
            const user = await signIn(details as SignInCredentials, env, req);
            if (typeof clientId === 'string' && env.clients.has(clientId)) {
                const client = env.clients.get(clientId);
                client.user = user; // Bind user to client socket
            }
            res.send({ 
                access_token: createPublicAccessToken(user.uid, req.ip, user.access_token, env.tokenSalt), 
                user: getPublicAccountDetails(user) 
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

export const addMiddleware = (env: RouteInitEnvironment) => {

    // Add bearer authentication middleware
    env.app.use(async (req: RouteRequest<any, any, any, { auth_token?: string }>, res, next) => {

        let authorization = req.get('Authorization');
        if (typeof authorization !== 'string' && 'auth_token' in req.query) {
            // Enables browser calls to be authenticated                        
            if (req.path.startsWith('/export/')) {
                // For now, only allow this if the intention is to call '/export' api call
                // In the future, use these prerequisites:
                // - user must be currently authenticated (in cache)
                // - ip address must match the token
                authorization = 'Bearer ' + req.query.auth_token;
            }
        }

        if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
            const token = authorization.slice(7);
            let tokenDetails;
            try {
                tokenDetails = decodePublicAccessToken(token, env.tokenSalt);
            }
            catch (err) {
                return sendNotAuthenticatedError(res, 'invalid_token', 'The passed token is invalid. Sign in again');
            }

            // Is this token cached?
            req.user = env.authCache.get(tokenDetails.uid);
            if (!req.user) {
                // Query database to get user for this token
                try {
                    await signIn({ method: 'access_token', access_token: token }, env, req);
                }
                catch (err) {
                    return sendNotAuthenticatedError(res, err.code, err.message);
                }
            }

            if (req.user.is_disabled === true) {
                return sendNotAuthenticatedError(res, 'account_disabled', 'Your account has been disabled. Contact your database administrator');
            }
        }
        next();
    });
};

export default addRoute;