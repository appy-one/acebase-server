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
const addRoute = (env) => {
    env.router.get(`/auth/${env.db.name}/state`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        if (req.user) {
            res.send({ signed_in: true, user: (0, user_1.getPublicAccountDetails)(req.user) });
        }
        else {
            res.send({ signed_in: false });
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=auth-state.js.map