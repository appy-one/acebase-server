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
const user_1 = require("../schema/user");
const error_1 = require("../shared/error");
const tokens_1 = require("../shared/tokens");
const signin_1 = require("../shared/signin");
const addRoute = (env) => {
    if (!env.config.auth.enabled) {
        throw new Error('Authentication not enabled in the server settings');
    }
    env.app.post(`/auth/${env.db.name}/signin`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const details = req.body;
        const clientId = details.client_id || null; // NEW in AceBaseClient v0.9.4
        try {
            const user = yield (0, signin_1.signIn)(details, env, req);
            if (typeof clientId === 'string' && env.clients.has(clientId)) {
                const client = env.clients.get(clientId);
                client.user = user; // Bind user to client socket
            }
            res.send({
                access_token: (0, tokens_1.createPublicAccessToken)(user.uid, req.ip, user.access_token, env.tokenSalt),
                user: (0, user_1.getPublicAccountDetails)(user)
            });
        }
        catch (err) {
            if (typeof err.code === 'string') {
                // Authentication error
                return (0, error_1.sendNotAuthenticatedError)(res, err.code, err.message);
            }
            // Unexpected error
            return (0, error_1.sendUnexpectedError)(res, err);
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=auth-signin.js.map