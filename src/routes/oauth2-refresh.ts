import { RouteInitEnvironment, RouteRequest } from '../shared/env';

export type RequestQuery = { provider: string; refresh_token: string };
export type RequestBody = null;
export type ResponseBody = { provider: { name: string; access_token: string; refresh_token: string; expires_in: number } };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {
    env.app.get(`/oauth2/${env.db.name}/refresh`, async (req: Request, res) => {

        try {
            const providerName =  req.query.provider;
            const refreshToken = req.query.refresh_token;
            const provider = env.authProviders[providerName];
            if (!provider) {
                throw new Error(`Provider ${provider} is not available, or not properly configured by the db admin`);
            }
            if (!refreshToken) {
                throw new Error(`No refresh_token passed`);
            }
            // Get new access & refresh tokens
            const tokens = await provider.getAccessToken({ type: 'refresh', refresh_token: refreshToken });
            res.send({
                provider: {
                    name: providerName,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expires_in: tokens.expires_in
                }
            });
        }
        catch(err) {
            res.status(500).send(err.message);
        }

    });
};

export default addRoute;