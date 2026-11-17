import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { AceBaseUser, getPublicAccountDetails } from '../schema/user';
import { sendNotAuthenticatedError, sendUnexpectedError } from '../shared/error';
import { createPublicAccessToken, decodePublicAccessToken } from '../shared/tokens';
import { signIn, SignInCredentials, SignInError } from '../shared/signin';
import { ConnectedClient } from '../shared/clients';

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

    env.router.post(`/auth/${env.db.name}/signin`, async (req: Request, res) => {

        const details = req.body;
        const clientId = details.client_id || null;  // NEW in AceBaseClient v0.9.4

        try {
            const credentials = ((): SignInCredentials => {
                if (details.method === 'token') {
                    // This is a public access token, convert to a private token that contains the user's uid and actual access token
                    try {
                        const tokenDetails = decodePublicAccessToken(details.access_token, env.tokenSalt);
                        return { method: 'token', uid: tokenDetails.uid, access_token: tokenDetails.access_token };
                    }
                    catch (err) {
                        throw new SignInError('invalid_token', `Access token is invalid. Sign in again`);
                    }
                }
                return details as SignInCredentials;
            })();

            const user = await signIn(credentials, env, req.ip);
            if (typeof clientId === 'string' && env.clients.has(clientId)) {
                const client = env.clients.get(clientId) as ConnectedClient;
                client.user = user; // Bind user to client socket
            }
            res.send({
                access_token: createPublicAccessToken(user.uid, req.ip, user.access_token as string, env.tokenSalt),
                user: getPublicAccountDetails(user),
            });
        }
        catch (err: any) {

            if (typeof err?.code === 'string') {
                // Authentication error
                return sendNotAuthenticatedError(res, err.code, err.message);
            }

            // Unexpected error
            return sendUnexpectedError(res, err);
        }

    });
};

export default addRoute;
