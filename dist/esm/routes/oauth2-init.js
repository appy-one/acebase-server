import { createSignedPublicToken } from '../shared/tokens.js';
export const addRoute = (env) => {
    env.router.get(`/oauth2/${env.db.name}/init`, async (req, res) => {
        try {
            const providerName = req.query.provider;
            const callbackUrl = req.query.callbackUrl;
            const options = Object.keys(req.query).filter(key => key.startsWith('option_')).reduce((options, key) => {
                const name = key.slice(7);
                let value = req.query[key];
                if (typeof value === 'string') {
                    // Check if this should be a boolean or number
                    if (['true', 'false'].includes(value)) {
                        value = value === 'true';
                    }
                    else if (/^\-?[0-9]+$/.test(value)) {
                        value = parseInt(value);
                    }
                }
                options[name] = value;
                return options;
            }, {});
            const signedInUid = req.user && req.user.uid;
            const provider = env.authProviders[providerName];
            if (!provider) {
                throw new Error(`Provider ${providerName} is not available, or not properly configured by the db admin`);
            }
            // Create secure state so it cannot be tampered with. hash it with a server-only known salt: the generated admin password salt
            if (!env.tokenSalt) {
                // Server is not ready yet. Used to do `await this.ready();` on the server instance, maybe do that again later
                throw new Error(`Server not ready yet`);
            }
            const state = createSignedPublicToken({ flow: 'redirect', provider: providerName, uid: signedInUid, callbackUrl }, env.tokenSalt);
            const clientAuthUrl = await provider.init({ redirect_url: `${req.protocol}://${req.headers.host}/oauth2/${env.db.name}/signin`, state, options });
            res.send({ redirectUrl: clientAuthUrl });
        }
        catch (err) {
            res.status(500).send(err.message);
        }
    });
};
export default addRoute;
//# sourceMappingURL=oauth2-init.js.map