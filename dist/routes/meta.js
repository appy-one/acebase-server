"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const meta_info_1 = require("./meta-info");
const meta_ping_1 = require("./meta-ping");
const meta_stats_1 = require("./meta-stats");
const addRoutes = (env) => {
    // Add info endpoint
    meta_info_1.default(env);
    // Add ping endpoint
    meta_ping_1.default(env);
    // Add database stats endpoint
    meta_stats_1.default(env);
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=meta.js.map