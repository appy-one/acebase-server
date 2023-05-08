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
    env.router.get(`/exists/${env.db.name}/*`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // Exists query
        const path = req.path.slice(env.db.name.length + 9);
        const access = yield env.rules.isOperationAllowed(req.user, path, 'exists', { context: req.context });
        if (!access.allow) {
            return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
        }
        try {
            const exists = yield env.db.ref(path).exists();
            res.send({ exists });
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-exists.js.map