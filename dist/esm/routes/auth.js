import { addMiddleware as addBearerAuthMiddleware } from '../middleware/user.js';
import { addRoute as addStateRoute } from './auth-state.js';
import { addRoute as addSignInRoute } from './auth-signin.js';
import { addRoute as addSignOutRoute } from './auth-signout.js';
import { addRoute as addVerifyEmailRoute } from './auth-verify-email.js';
import { addRoute as addResetPasswordRoute } from './auth-reset-password.js';
import { addRoute as addChangePasswordRoute } from './auth-change-password.js';
import { addRoute as addSignUpRoute } from './auth-signup.js';
import { addRoute as addUpdateRoute } from './auth-update.js';
import { addRoute as addDeleteRoute } from './auth-delete.js';
import { addRoute as addOAuth2InitRoute } from './oauth2-init.js';
import { addRoute as addOAuth2SignInRoute } from './oauth2-signin.js';
import { addRoute as addOAuth2RefreshRoute } from './oauth2-refresh.js';
export const addAuthenticionRoutes = (env) => {
    if (!env.config.auth.enabled) {
        throw new Error('Authentication not enabled in the server settings');
    }
    // Bearer authentication middleware
    addBearerAuthMiddleware(env);
    // Auth state endpoint
    addStateRoute(env);
    // signin endpoint
    addSignInRoute(env);
    // signout endpoint
    addSignOutRoute(env);
    // verify email endpoint
    const verifyEmailAddress = addVerifyEmailRoute(env);
    // reset password endpoint
    const resetPassword = addResetPasswordRoute(env);
    // change password endpoint
    addChangePasswordRoute(env);
    // signup endpoint
    addSignUpRoute(env);
    // update enpoint
    addUpdateRoute(env);
    // delete endpoint
    addDeleteRoute(env);
    // OAuth2 init endpoint
    addOAuth2InitRoute(env);
    // OAuth2 signin endpoint
    addOAuth2SignInRoute(env);
    // OAuth2 token refresh endpoint
    addOAuth2RefreshRoute(env);
    // Return auth functions that can be used directly through an AceBaseServer instance
    return {
        verifyEmailAddress,
        resetPassword
    };
};
export default addAuthenticionRoutes;
//# sourceMappingURL=auth.js.map