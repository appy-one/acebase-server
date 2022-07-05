"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = void 0;
const error_1 = require("../shared/error");
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
const adminOnly = (env, errorMessage = 'only admin can perform this operation') => {
    return (req, res, next) => {
        if (env.config.auth.enabled && (!req.user || req.user.uid !== 'admin')) {
            return (0, error_1.sendUnauthorizedError)(res, 'admin_only', errorMessage);
        }
        next();
    };
};
exports.adminOnly = adminOnly;
exports.default = exports.adminOnly;
//# sourceMappingURL=admin-only.js.map