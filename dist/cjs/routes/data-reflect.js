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
    env.app.get(`/reflect/${env.db.name}/*`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // Reflection API
        const path = req.path.slice(env.db.name.length + 10);
        const access = env.rules.userHasAccess(req.user, path, false);
        if (!access.allow) {
            return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
        }
        const impersonatedAccess = {
            uid: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== 'admin' ? null : req.query.impersonate,
            read: {
                allow: false,
                error: null
            },
            write: {
                allow: false,
                error: null
            }
        };
        const impersonatedUser = impersonatedAccess.uid === 'anonymous' ? null : { uid: impersonatedAccess.uid };
        if (impersonatedAccess.uid) {
            const readAccess = env.rules.userHasAccess(impersonatedUser, path, false);
            impersonatedAccess.read.allow = readAccess.allow;
            if (!readAccess.allow) {
                impersonatedAccess.read.error = { code: readAccess.code, message: readAccess.message };
            }
            const writeAccess = env.rules.userHasAccess(impersonatedUser, path, true);
            impersonatedAccess.write.allow = writeAccess.allow;
            if (!writeAccess.allow) {
                impersonatedAccess.write.error = { code: writeAccess.code, message: writeAccess.message };
            }
        }
        const type = req.query.type;
        const args = {};
        Object.keys(req.query).forEach(key => {
            if (!['type', 'impersonate'].includes(key)) {
                let val = req.query[key];
                if (/^(?:true|false|[0-9]+)$/.test(val)) {
                    val = JSON.parse(val);
                }
                args[key] = val;
            }
        });
        try {
            const result = yield env.db.ref(path).reflect(type, args);
            if (impersonatedAccess.uid) {
                result.impersonation = impersonatedAccess;
                let list;
                if (type === 'children') {
                    list = result.list;
                }
                else if (type === 'info') {
                    list = typeof result.children === 'object' && 'list' in result.children ? result.children.list : [];
                }
                list && list.forEach(childInfo => {
                    childInfo.access = {
                        read: env.rules.userHasAccess(impersonatedUser, acebase_core_1.PathInfo.getChildPath(path, childInfo.key), false).allow,
                        write: env.rules.userHasAccess(impersonatedUser, acebase_core_1.PathInfo.getChildPath(path, childInfo.key), true).allow
                    };
                });
            }
            res.send(result);
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-reflect.js.map