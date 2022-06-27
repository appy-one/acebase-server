import type { RouteInitEnvironment } from '../shared/env';
import addInfoRoute from './meta-info';
import addPingRoute from './meta-ping';
import addStatsRoute from './meta-stats';
import addLogsRoute from './meta-logs';

export const addRoutes = (env: RouteInitEnvironment) => {
    
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