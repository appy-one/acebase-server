import addInfoRoute from './meta-info.js';
import addPingRoute from './meta-ping.js';
import addStatsRoute from './meta-stats.js';
export const addRoutes = (env) => {
    // Add info endpoint
    addInfoRoute(env);
    // Add ping endpoint
    addPingRoute(env);
    // Add database stats endpoint
    addStatsRoute(env);
};
export default addRoutes;
//# sourceMappingURL=meta.js.map