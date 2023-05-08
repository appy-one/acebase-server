import { RouteInitEnvironment } from '../shared/env';
/**
 * Adds 404 middleware. This binds to `env.app` so routes added to `env.router` always come first, even if they are added after the 404 handler
 * @param env
 */
export declare const addMiddleware: (env: RouteInitEnvironment) => void;
export default addMiddleware;
//# sourceMappingURL=404.d.ts.map