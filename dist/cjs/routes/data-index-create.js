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
    const handleRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const data = req.body;
            yield env.db.indexes.create(data.path, data.key, data.options);
            res.contentType('application/json').send({ success: true });
        }
        catch (err) {
            env.debug.error(`failed to perform index action`, err);
            (0, error_1.sendError)(res, err);
        }
    });
    env.app.post(`/index/${env.db.name}`, (0, admin_only_1.default)(env), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // Legacy endpoint that was designed to handle multiple actions
        // The only action ever implemented was 'create', so we'll handle that here
        if (((_a = req.body) === null || _a === void 0 ? void 0 : _a.action) !== 'create') {
            return (0, error_1.sendError)(res, { code: 'invalid_action', message: 'Invalid action' });
        }
        handleRequest(req, res);
    }));
    env.app.post(`/index/${env.db.name}/create`, (0, admin_only_1.default)(env), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // New dedicated create endpoint
        handleRequest(req, res);
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-index-create.js.map