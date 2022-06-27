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
    env.app.get(`/logs/${env.db.name}`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        // Get database logs
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== 'admin') {
            return (0, error_1.sendUnauthorizedError)(res, 'admin_only', 'Only the admin user has access to logs');
        }
        // Create index is it's not there yet
        const db = env.log.ref.db;
        const createIndexes = [
            db.indexes.create(env.log.ref.path, 'date') //, { include: ['action', 'ip', 'code'] })
        ];
        if (req.query.filter_col === 'action') {
            createIndexes.push(db.indexes.create(env.log.ref.path, 'action', { include: ['date'] })); // , 'ip', 'code'
        }
        if (req.query.filter_col === 'code') {
            createIndexes.push(db.indexes.create(env.log.ref.path, 'code', { include: ['date'] })); // , 'ip'
        }
        yield Promise.all(createIndexes);
        try {
            const query = env.log.query()
                .take(parseInt((_b = req.query.take) !== null && _b !== void 0 ? _b : '100'))
                .skip(parseInt((_c = req.query.skip) !== null && _c !== void 0 ? _c : '0'))
                .sort((_d = req.query.sort) !== null && _d !== void 0 ? _d : 'date', false);
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