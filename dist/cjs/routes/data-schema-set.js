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
const admin_only_1 = require("../middleware/admin-only");
const error_1 = require("../shared/error");
const addRoute = (env) => {
    env.app.post(`/schema/${env.db.name}`, (0, admin_only_1.default)(env), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // defines a schema
        try {
            const data = req.body;
            const { path, schema } = data;
            yield env.db.schema.set(path, schema);
            res.contentType('application/json').send({ success: true });
        }
        catch (err) {
            (0, error_1.sendError)(res, err);
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-schema-set.js.map