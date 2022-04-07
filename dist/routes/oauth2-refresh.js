"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const addRoute = (env) => {
    env.app.get(`/oauth2/${env.db.name}/refresh`, async (req, res) => {
        try {
            const providerName = req.query.provider;
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
        catch (err) {
            res.status(500).send(err.message);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=oauth2-refresh.js.map