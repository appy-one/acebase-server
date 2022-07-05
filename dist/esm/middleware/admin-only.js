import { sendUnauthorizedError } from "../shared/error.js";
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
export const adminOnly = (env, errorMessage = 'only admin can perform this operation') => {
    return (req, res, next) => {
        if (env.config.auth.enabled && (!req.user || req.user.uid !== 'admin')) {
            return sendUnauthorizedError(res, 'admin_only', errorMessage);
        }
        next();
    };
};
export default adminOnly;
//# sourceMappingURL=admin-only.js.map