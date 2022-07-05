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
const acebase_core_1 = require("acebase-core");
const admin_only_1 = require("../middleware/admin-only");
const error_1 = require("../shared/error");
const addRoute = (env) => {
    env.app.post(`/schema/${env.db.name}/test`, (0, admin_only_1.default)(env), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        // tests a schema
        try {
            const data = req.body;
            if (typeof ((_a = data.value) === null || _a === void 0 ? void 0 : _a.val) === 'undefined' || !['string', 'object', 'undefined'].includes(typeof ((_b = data.value) === null || _b === void 0 ? void 0 : _b.map))) {
                return (0, error_1.sendError)(res, { code: 'invalid_serialized_value', message: 'The sent value is not properly serialized' });
            }
            const value = acebase_core_1.Transport.deserialize(data.value);
            const { path, schema, partial } = data;
            let result;
            if (schema) {
                const definition = new acebase_core_1.SchemaDefinition(schema);
                result = definition.check(path, value, partial);
            }
            else {
                result = yield env.db.schema.check(path, schema, partial);
            }
            res.contentType('application/json').send(result);
        }
        catch (err) {
            (0, error_1.sendError)(res, err);
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-schema-test.js.map