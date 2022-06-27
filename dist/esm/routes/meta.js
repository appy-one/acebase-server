import addInfoRoute from './meta-info.js';
import addPingRoute from './meta-ping.js';
import addStatsRoute from './meta-stats.js';
import addLogsRoute from './meta-logs.js';
export const addRoutes = (env) => {
    // Add info endpoint
    addInfoRoute(env);
    // Add ping endpoint
    addPingRoute(env);
    // Add database stats endpoint
    addStatsRoute(env);
    // Add logs endpoint (admin only)
    addLogsRoute(env);
};
export default addRoutes;
//# sourceMappingURL=meta.js.map