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
    env.app.get(`/schema/${env.db.name}/*`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // Get defined schema for a specifc path
        if (!req.user || req.user.username !== 'admin') {
            return (0, error_1.sendUnauthorizedError)(res, 'admin_only', 'only admin can perform schema operations');
        }
        try {
            const path = req.path.slice(env.db.name.length + 9);
            const schema = yield env.db.schema.get(path);
            if (!schema) {
                return res.status(410).send('Not Found');
            }
            res.contentType('application/json').send({
                path: schema.path,
                schema: typeof schema.schema === 'string' ? schema.schema : schema.text,
                text: schema.text
            });
        }
        catch (err) {
            (0, error_1.sendError)(res, err);
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-schema-get.js.map