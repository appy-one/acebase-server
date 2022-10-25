import type { RouteInitEnvironment } from '../shared/env';
/**
 * Adds connection management middleware. Add this as very first handler!
 * @param env
 */
export declare const addMiddleware: (env: RouteInitEnvironment) => () => void;
export default addMiddleware;
//# sourceMappingURL=connection.d.ts.map