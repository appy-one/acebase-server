import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { AceBaseUser, getPublicAccountDetails } from '../schema/user';
import { sendNotAuthenticatedError, sendUnexpectedError } from '../shared/error';
import { createPublicAccessToken } from '../shared/tokens';
import { signIn, SignInCredentials } from '../shared/signin';

export type RequestQuery = never;
export type RequestBody = { client_id?: string } & (
    { method: 'token'; access_token: string } |
    { method: 'email'; email: string; password: string } |
    { method: 'account', username: string, password: string }
);
export type ResponseBody = {
    access_token: string;
    user: AceBaseUser;
};

export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {
    if (!env.config.auth.enabled) {
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
