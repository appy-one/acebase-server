"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const user_1 = require("../schema/user");
const addRoute = (env) => {
    env.app.get(`/auth/${env.db.name}/state`, async (req, res) => {
        if (req.user) {
            res.send({ signed_in: true, user: user_1.getPublicAccountDetails(req.user) });
        }
        else {
            res.send({ signed_in: false });
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=auth-state.js.map