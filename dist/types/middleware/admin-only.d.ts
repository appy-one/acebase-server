import { NextFunction } from "express";
import { RouteInitEnvironment, RouteRequest } from "../shared/env";
import type { Response } from "../shared/http";
/**
 * Middleware function that checks if the current user is `admin`. An 403 Forbidden error will be sent in the response if
 * authentication is enabled on the server and the user is not signed in as admin.
 *
 * Can be applied to any route by adding it in the router chain.
 * @example
 * app.get('/endpoint', adminOnly(env), (req, res) => {
 *    // If we get here we are either an admin,
 *    // or the server doesn't have authentication enabled.
 * })
 * @param env Middle
 * @param errorMessage
 * @returns
 */
export declare const adminOnly: (env: RouteInitEnvironment, errorMessage?: string) => (req: RouteRequest, res: Response, next: NextFunction) => void;
export default adminOnly;
//# sourceMappingURL=admin-only.d.ts.map