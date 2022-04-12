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
const error_1 = require("../shared/error");
const addRoute = (env) => {
    env.app.get(`/sync/changes/${env.db.name}`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // Gets effective changes for specific path(s) and event combinations since given cursor
        if (!((_a = env.config.transactions) === null || _a === void 0 ? void 0 : _a.log)) {
            return (0, error_1.sendBadRequestError)(res, { code: 'no_transaction_logging', message: 'Transaction logging not enabled' });
        }
        try {
            const data = req.query;
            let targets = typeof data.path === 'string'
                ? [{ path: data.path, events: ['value'] }]
                : typeof data.for === 'string'
                    ? JSON.parse(data.for)
                    : null;
            if (targets === null) {
                return (0, error_1.sendBadRequestError)(res, { code: 'invalid_request', message: 'Invalid changes request' });
            }
            if (targets.length === 0) {
                targets.push({ path: '', events: ['value'] });
            }
            // Filter out any requested paths user does not have access to.
            targets = targets.filter(target => {
                let path = target.path;
                if (target.events.every(event => /^(?:notify_)?child_/.test(event))) { //if (!target.events.some(event => ['value','notify_value','mutations','mutated'].includes(event))) {
                    // Only child_ events, check if they have access to children instead
                    path = acebase_core_1.PathInfo.get(path).childPath('*');
                }
                return env.rules.userHasAccess(req.user, path, false).allow;
            });
            if (targets.length === 0) {
                return (0, error_1.sendUnauthorizedError)(res, 'not_authorized', 'User is not authorized to access this data');
            }
            const { cursor, timestamp } = data;
            const result = yield env.db.api.getChanges({ for: targets, cursor, timestamp });
            res.setHeader('AceBase-Context', JSON.stringify({ acebase_cursor: result.new_cursor }));
            res.contentType('application/json');
            res.send(result.changes);
        }
        catch (err) {
            (0, error_1.sendError)(res, err);
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-sync-changes.js.map