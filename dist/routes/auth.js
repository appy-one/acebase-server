"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAuthenticionRoutes = void 0;
const user_1 = require("../middleware/user");
const auth_state_1 = require("./auth-state");
const auth_signin_1 = require("./auth-signin");
const auth_signout_1 = require("./auth-signout");
const auth_verify_email_1 = require("./auth-verify-email");
const auth_reset_password_1 = require("./auth-reset-password");
const auth_change_password_1 = require("./auth-change-password");
const auth_signup_1 = require("./auth-signup");
const auth_update_1 = require("./auth-update");
const auth_delete_1 = require("./auth-delete");
const oauth2_init_1 = require("./oauth2-init");
const oauth2_signin_1 = require("./oauth2-signin");
const oauth2_refresh_1 = require("./oauth2-refresh");
const addAuthenticionRoutes = (env) => {
    if (!env.config.auth.enabled) {
        throw new Error('Authentication not enabled in the server settings');
    }
    // Bearer authentication middleware
    user_1.addMiddleware(env);
    // Auth state endpoint
    auth_state_1.addRoute(env);
    // signin endpoint
    auth_signin_1.addRoute(env);
    // signout endpoint
    auth_signout_1.addRoute(env);
    // verify email endpoint
    const verifyEmailAddress = auth_verify_email_1.addRoute(env);
    // reset password endpoint
    const resetPassword = auth_reset_password_1.addRoute(env);
    // change password endpoint
    auth_change_password_1.addRoute(env);
    // signup endpoint
    auth_signup_1.addRoute(env);
    // update enpoint
    auth_update_1.addRoute(env);
    // delete endpoint
    auth_delete_1.addRoute(env);
    // OAuth2 init endpoint
    oauth2_init_1.addRoute(env);
    // OAuth2 signin endpoint
    oauth2_signin_1.addRoute(env);
    // OAuth2 token refresh endpoint
    oauth2_refresh_1.addRoute(env);
    // Return auth functions that can be used directly through an AceBaseServer instance
    return {
        verifyEmailAddress,
        resetPassword
    };
};
exports.addAuthenticionRoutes = addAuthenticionRoutes;
exports.default = exports.addAuthenticionRoutes;
//# sourceMappingURL=auth.js.map