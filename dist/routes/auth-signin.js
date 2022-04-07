"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const user_1 = require("../schema/user");
const error_1 = require("../shared/error");
const tokens_1 = require("../shared/tokens");
const signin_1 = require("../shared/signin");
const addRoute = (env) => {
    if (!env.config.auth.enabled) {
        throw new Error('Authentication not enabled in the server settings');
    }
    env.app.post(`/auth/${env.db.name}/signin`, async (req, res) => {
        const details = req.body;
        const clientId = details.client_id || null; // NEW in AceBaseClient v0.9.4
        try {
            const user = await signin_1.signIn(details, env, req);
            if (typeof clientId === 'string' && env.clients.has(clientId)) {
                const client = env.clients.get(clientId);
                client.user = user; // Bind user to client socket
            }
            res.send({
                access_token: tokens_1.createPublicAccessToken(user.uid, req.ip, user.access_token, env.tokenSalt),
                user: user_1.getPublicAccountDetails(user)
            });
        }
        catch (err) {
            if (typeof err.code === 'string') {
                // Authentication error
                return error_1.sendNotAuthenticatedError(res, err.code, err.message);
            }
            // Unexpected error
            return error_1.sendUnexpectedError(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=auth-signin.js.map