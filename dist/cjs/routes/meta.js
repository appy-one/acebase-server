"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const meta_info_1 = require("./meta-info");
const meta_ping_1 = require("./meta-ping");
const meta_stats_1 = require("./meta-stats");
const meta_logs_1 = require("./meta-logs");
const addRoutes = (env) => {
    // Add info endpoint
    (0, meta_info_1.default)(env);
    // Add ping endpoint
    (0, meta_ping_1.default)(env);
    // Add database stats endpoint
    (0, meta_stats_1.default)(env);
    // Add logs endpoint (admin only)
    (0, meta_logs_1.default)(env);
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=meta.js.map