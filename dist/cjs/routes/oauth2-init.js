"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const tokens_1 = require("../shared/tokens");
const addRoute = (env) => {
    env.app.get(`/oauth2/${env.db.name}/init`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            const state = (0, tokens_1.createSignedPublicToken)({ flow: 'redirect', provider: providerName, uid: signedInUid, callbackUrl }, env.tokenSalt);
            const clientAuthUrl = yield provider.init({ redirect_url: `${req.protocol}://${req.headers.host}/oauth2/${env.db.name}/signin`, state, options });
            res.send({ redirectUrl: clientAuthUrl });
        }
        catch (err) {
            res.status(500).send(err.message);
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=oauth2-init.js.map