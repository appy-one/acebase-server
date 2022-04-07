import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { AceBaseUser, DbUserAccountDetails, getPublicAccountDetails, UserProfilePicture } from '../schema/user';
import { emailExistsError, invalidDisplayNameError, invalidEmailError, invalidPictureError, invalidSettingsError, invalidUsernameError, isValidDisplayName, isValidEmail, isValidNewEmailAddress, isValidNewUsername, isValidPicture, isValidSettings, isValidUsername, usernameExistsError } from '../shared/validate';
import { sendNotAuthenticatedError, sendUnauthorizedError, sendUnexpectedError } from '../shared/error';

export class UpdateError extends Error { 
    constructor(public code: 'unauthenticated_update'|'unauthorized_update'|'user_not_found'|'invalid_email'|'email_conflict'|'invalid_username'|'username_conflict'|'invalid_display_name'|'invalid_picture'|'invalid_settings', message: string) {
        super(message);
    }
}

export type RequestQuery = {};
export type RequestBody = {
    /** admin only: specifies user account to update */
    uid: string;
    /** Admin only: whether to enable or disable the account */
    is_disabled?: boolean;
    email?: string;
    username?: string;
    displayName?: string;
    display_name?: string;
    picture?: UserProfilePicture;
    settings?: {
        [name: string]: string|number|boolean
    };
} & (
    // Allow both spellings of display name. display_name is used in the db, displayName in public user detail server responses.
    // displayName is prefered and documented in the OpenAPI docs
    { displayName: string; } | { display_name: string; }
);

export type ResponseBody = { user: AceBaseUser } | { code: UpdateError['code']; message: string };
export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

export const addRoute = (env: RouteInitEnvironment) => {
    env.app.post(`/auth/${env.db.name}/update`, async (req: Request, res) => {

        let details = req.body;

        if (!req.user) {
            env.logRef.push({ action: 'update', success: false, code: 'unauthenticated_update', update_uid: details.uid, ip: req.ip, date: new Date() });
            return sendNotAuthenticatedError(res, 'unauthenticated_update', 'Sign in to change details');
        }

        const uid = details.uid || req.user.uid;

        if (req.user.uid !== 'admin' && (uid !== req.user.uid || typeof details.is_disabled === 'boolean')) {
            env.logRef.push({ action: 'update', success: false, code: 'unauthorized_update', auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });
            return sendUnauthorizedError(res, 'unauthorized_update', 'You are not authorized to perform this update. This attempt has been logged.');
        }

        if (typeof details.display_name === 'undefined' && typeof details.displayName === 'string') {
            // Allow displayName to be sent also (which is used in signup endpoint)
            details.display_name = details.displayName;
        }

        // Check if sent details are ok
        let err: { code: UpdateError['code'], message: string };
        if (details.email && !isValidEmail(details.email)) {
            err = invalidEmailError;
        }
        else if (details.email && !await isValidNewEmailAddress(env.authRef, details.email)) {
            err = emailExistsError;
        }
        else if (details.username && !isValidUsername(details.username)) {
            err = invalidUsernameError;
        }
        else if (details.username && !await isValidNewUsername(env.authRef, details.username)) {
            err = usernameExistsError;
        }
        else if (details.display_name && !isValidDisplayName(details.display_name)) {
            err = invalidDisplayNameError;
        }
        else if (details.picture && !isValidPicture(details.picture)) {
            err = invalidPictureError;
        }
        else if (!isValidSettings(details.settings)) {
            err = invalidSettingsError;
        }

        if (err) {
            // Log failure
            env.logRef.push({ action: 'update', success: false, code: err.code, auth_uid: req.user.uid, update_uid: uid, ip: req.ip, date: new Date() });
            res.status(422).send(err); // Unprocessable Entity
            return;
        }

        try {
            let user: DbUserAccountDetails;
            await env.authRef.child(uid).transaction(snap => {
                if (!snap.exists()) {
                    throw new UpdateError('user_not_found', `No user found with uid ${uid}`);
                }
                user = snap.val();
                if (details.email && details.email !== user.email) {
                    user.email = details.email; 
                    user.email_verified = false; // TODO: send verification email
                }
                if (details.username) { user.username = details.username; }
                if (details.display_name) { user.display_name = details.display_name; }
                if (details.picture) { user.picture = details.picture; }
                if (details.settings) {
                    if (typeof user.settings !== 'object') {
                        user.settings = {};
                    }
                    Object.keys(details.settings).forEach(key => {
                        user.settings[key] = details.settings[key];
                    });
                    if (!isValidSettings(user.settings)) {
                        err = invalidSettingsError;
                        env.logRef.push({ action: 'update', success: false, code: 'too_many_settings', auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });
                        res.statusCode = 422; // Unprocessable Entity
                        res.send(err);
                        return;
                    }
                }
                if (typeof details.is_disabled === 'boolean') {
                    user.is_disabled = details.is_disabled;
                }

                return user; // Update db user
            });

            // Update cache
            env.authCache.set(user.uid, user);

            // Send merged results back
            res.send({ user: getPublicAccountDetails(user) });
        }
        catch (err) {

            // All known errors except user_not_found will have been sent already
            if (err.code === 'user_not_found') {
                env.logRef.push({ action: 'update', success: false, code: err.code, auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });

                res.statusCode = 404; // Not Found
                res.send(err);
            }
            else {
                // Unexpected
                env.logRef.push({ action: 'update', success: false, code: err.code || 'unexpected', message: err.message, auth_uid: req.user.uid, update_uid: details.uid, ip: req.ip, date: new Date() });
                sendUnexpectedError(res, err);
            }
        }

    });
};