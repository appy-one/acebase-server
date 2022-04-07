import { RouteInitEnvironment } from '../shared/env';
import { addMiddleware as addBearerAuthMiddleware } from '../middleware/user';
import { addRoute as addStateRoute } from './auth-state';
import { addRoute as addSignInRoute } from './auth-signin';
import { addRoute as addSignOutRoute } from './auth-signout';
import { addRoute as addVerifyEmailRoute } from './auth-verify-email';
import { addRoute as addResetPasswordRoute } from './auth-reset-password';
import { addRoute as addChangePasswordRoute } from './auth-change-password';
import { addRoute as addSignUpRoute } from './auth-signup';
import { addRoute as addUpdateRoute } from './auth-update';
import { addRoute as addDeleteRoute } from './auth-delete';
import { addRoute as addOAuth2InitRoute } from './oauth2-init';
import { addRoute as addOAuth2SignInRoute } from './oauth2-signin';
import { addRoute as addOAuth2RefreshRoute } from './oauth2-refresh';

export const addAuthenticionRoutes = (env: RouteInitEnvironment) => {
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