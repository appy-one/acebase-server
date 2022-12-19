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
const error_1 = require("../shared/error");
const addRoute = (env) => {
    env.app.post(`/auth/${env.db.name}/signout`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        const LOG_ACTION = 'auth.signout';
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null };
        try {
            if (req.user) {
                const client = typeof req.body.client_id === 'string' ? env.clients.get(req.body.client_id) : null; // NEW in AceBaseClient v0.9.4
                if (client) {
                    // Remove user binding from client socket
                    client.user = null;
                }
                const signOutEverywhere = typeof req.body === 'object' && req.body.everywhere === true; // NEW in AceBaseClient v0.9.14
                if (signOutEverywhere) {
                    // Remove token from cache
                    env.authCache.remove(req.user.uid);
                    // Remove user binding from all clients signed in with current user
                    for (const client of env.clients.values()) {
                        if (((_c = client.user) === null || _c === void 0 ? void 0 : _c.uid) === req.user.uid) {
                            client.user = null;
                        }
                    }
                }
                // Remove token from user's auth node
                yield env.authRef.child(req.user.uid).transaction(snap => {
                    if (!snap.exists()) {
                        return;
                    }
                    const user = snap.val();
                    if (signOutEverywhere) {
                        user.access_token = null;
                    }
                    user.last_signout = new Date();
                    user.last_signout_ip = req.ip;
                    return user;
                });
                env.log.event(LOG_ACTION, LOG_DETAILS);
            }
            res.send('Bye!');
        }
        catch (err) {
            env.log.error(LOG_ACTION, 'unexpected', Object.assign(Object.assign({}, LOG_DETAILS), { message: err instanceof Error ? err.message : err.toString() }));
            (0, error_1.sendUnexpectedError)(res, err);
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=auth-signout.js.map