import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { AceBaseUser, UserProfilePicture } from '../schema/user';
export declare class SignupError extends Error {
    code: 'admin_only' | 'conflict' | 'email_conflict' | 'username_conflict' | 'missing_details' | 'invalid_email' | 'invalid_username' | 'invalid_display_name' | 'invalid_password' | 'invalid_picture' | 'invalid_settings';
    constructor(code: 'admin_only' | 'conflict' | 'email_conflict' | 'username_conflict' | 'missing_details' | 'invalid_email' | 'invalid_username' | 'invalid_display_name' | 'invalid_password' | 'invalid_picture' | 'invalid_settings', message: string);
}
export type RequestQuery = never;
export type RequestBody = {
    username: string;
    email: string;
    password: string;
    displayName?: string;
    display_name?: string;
    picture?: UserProfilePicture;
    settings: {
        [name: string]: string | number | boolean;
    };
} & ({
    displayName: string;
} | {
    display_name: string;
});
export type ResponseBody = {
    access_token: string;
    user: AceBaseUser;
} | {
    code: SignupError['code'];
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=auth-signup.d.ts.map