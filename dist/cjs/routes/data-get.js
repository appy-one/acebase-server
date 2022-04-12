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
    env.app.get(`/data/${env.db.name}/*`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // Request data
        const path = req.path.slice(env.db.name.length + 7);
        const access = env.rules.userHasAccess(req.user, path, false);
        if (!access.allow) {
            return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
        }
        const options = {};
        if (req.query.include) {
            options.include = req.query.include.split(',');
        }
        if (req.query.exclude) {
            options.exclude = req.query.exclude.split(',');
        }
        if (typeof req.query.child_objects === 'boolean') {
            options.child_objects = req.query.child_objects;
        }
        if (path === '') {
            // If user has access to the root of database (NOT recommended for others than admin...)
            // Do not return private server data. If the admin user wants access, they should use 
            // direct requests on those paths (GET /data/dbname/__auth__), or use reflection
            if (options.include) {
                // Remove all includes for private paths
                options.include = options.include.filter(path => !path.startsWith('__'));
            }
            // Add private paths to exclude
            options.exclude = [...options.exclude || [], '__auth__', '__log__'];
        }
        try {
            // const snap = await db.ref(path).get(options);
            // const value = snap.val(), context = snap.context();
            const { value, context } = yield env.db.api.get(path, options);
            if (!((_a = env.config.transactions) === null || _a === void 0 ? void 0 : _a.log)) {
                delete context.acebase_cursor;
            }
            const serialized = acebase_core_1.Transport.serialize(value);
            res.setHeader('AceBase-Context', JSON.stringify(context));
            res.send({
                exists: value !== null,
                val: serialized.val,
                map: serialized.map
            });
        }
        catch (err) {
            res.status(500).send(err);
        }
    }));
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-get.js.map