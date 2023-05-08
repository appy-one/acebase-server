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
    env.router.post(`/index/${env.db.name}/delete`, (0, admin_only_1.default)(env), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // Delete an index
        try {
            const data = req.body;
            if (!data.fileName) {
                throw new Error('fileName not given');
            }
            yield env.db.indexes.delete(data.fileName); // Requires newer acebase & acebase-core packages
            res.contentType('application/json').send({ success: true });
        }
        catch (err) {
            env.debug.error(`failed to perform index action`, err);
            (0, error_1.sendError)(res, err);
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-index-delete.js.map