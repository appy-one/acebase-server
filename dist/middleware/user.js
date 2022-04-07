"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMiddleware = void 0;
const error_1 = require("../shared/error");
const signin_1 = require("../shared/signin");
const tokens_1 = require("../shared/tokens");
const addMiddleware = (env) => {
    // Add bearer authentication middleware
    env.app.use(async (req, res, next) => {
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
                tokenDetails = tokens_1.decodePublicAccessToken(token, env.tokenSalt);
            }
            catch (err) {
                return error_1.sendNotAuthenticatedError(res, 'invalid_token', 'The passed token is invalid. Sign in again');
            }
            // Is this token cached?
            req.user = env.authCache.get(tokenDetails.uid);
            if (!req.user) {
                // Query database to get user for this token
                try {
                    await signin_1.signIn({ method: 'access_token', access_token: token }, env, req);
                }
                catch (err) {
                    return error_1.sendNotAuthenticatedError(res, err.code, err.message);
                }
            }
            if (req.user.is_disabled === true) {
                return error_1.sendNotAuthenticatedError(res, 'account_disabled', 'Your account has been disabled. Contact your database administrator');
            }
        }
        next();
    });
};
exports.addMiddleware = addMiddleware;
//# sourceMappingURL=user.js.map