import type { RouteInitEnvironment } from '../shared/env';
import addInfoRoute from './meta-info';
import addPingRoute from './meta-ping';
import addStatsRoute from './meta-stats';

export const addRoutes = (env: RouteInitEnvironment) => {
    
    // Add info endpoint
    addInfoRoute(env);

    // Add ping endpoint
    addPingRoute(env);

    // Add database stats endpoint
    addStatsRoute(env);
};

export default addRoutes;