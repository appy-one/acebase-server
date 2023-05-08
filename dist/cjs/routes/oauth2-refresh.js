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
const addRoute = (env) => {
    env.router.get(`/oauth2/${env.db.name}/refresh`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            const tokens = yield provider.getAccessToken({ type: 'refresh', refresh_token: refreshToken });
            res.send({
                provider: {
                    name: providerName,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expires_in: tokens.expires_in,
                },
            });
        }
        catch (err) {
            res.status(500).send(err.message);
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=oauth2-refresh.js.map