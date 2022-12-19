import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { AceBaseUser, UserProfilePicture } from '../schema/user';
export declare class UpdateError extends Error {
    code: 'unauthenticated_update' | 'unauthorized_update' | 'user_not_found' | 'invalid_email' | 'email_conflict' | 'invalid_username' | 'username_conflict' | 'invalid_display_name' | 'invalid_picture' | 'invalid_settings';
    constructor(code: 'unauthenticated_update' | 'unauthorized_update' | 'user_not_found' | 'invalid_email' | 'email_conflict' | 'invalid_username' | 'username_conflict' | 'invalid_display_name' | 'invalid_picture' | 'invalid_settings', message: string);
}
export declare type RequestQuery = never;
export declare type RequestBody = {
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
        [name: string]: string | number | boolean;
    };
} & ({
    displayName: string;
} | {
    display_name: string;
});
export declare type ResponseBody = {
    user: AceBaseUser;
} | {
    code: UpdateError['code'];
    message: string;
};
export declare type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
//# sourceMappingURL=auth-update.d.ts.map