"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const addRoute = (env) => {
    env.app.get(`/stats/${env.db.name}`, async (req, res) => {
        // Get database stats
        try {
            const stats = await env.db.api.stats();
            res.send(stats);
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=meta-stats.js.map