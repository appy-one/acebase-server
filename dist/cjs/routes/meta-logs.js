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
const addRoute = (env) => {
    env.app.get(`/logs/${env.db.name}`, (0, admin_only_1.default)(env), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // Get database logs
        var _a, _b, _c;
        // Create indexes if not there yet
        const db = env.log.ref.db;
        const createIndexes = [
            db.indexes.create(env.log.ref.path, 'date'),
        ];
        if (req.query.filter_col === 'action') {
            createIndexes.push(db.indexes.create(env.log.ref.path, 'action', { include: ['date'] }));
        }
        if (req.query.filter_col === 'code') {
            createIndexes.push(db.indexes.create(env.log.ref.path, 'code', { include: ['date'] }));
        }
        yield Promise.all(createIndexes);
        try {
            const query = env.log.query()
                .take(parseInt((_a = req.query.take) !== null && _a !== void 0 ? _a : '100'))
                .skip(parseInt((_b = req.query.skip) !== null && _b !== void 0 ? _b : '0'))
                .sort((_c = req.query.sort) !== null && _c !== void 0 ? _c : 'date', false);
            if (req.query.filter_col) {
                query.filter(req.query.filter_col, req.query.filter_op, req.query.filter_val);
            }
            const snaps = yield query.get();
            const logs = snaps.getValues();
            res.send(logs);
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err.message);
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=meta-logs.js.map