import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { DbUserAccountDetails } from '../schema/user';
export declare class ResetPasswordError extends Error {
    code: 'invalid_code' | 'unknown_user' | 'password_requirement_mismatch';
    constructor(code: 'invalid_code' | 'unknown_user' | 'password_requirement_mismatch', message: string);
}
export declare type RequestQuery = {};
export declare type RequestBody = {
    code: string;
    password: string;
};
export declare type ResponseBody = 'OK' | {
    code: string;
    message: string;
};
export declare type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
/**
 * Adds the reset_password route and returns the reset function that can be used to manually reset a password
 * @param env environment
 * @returns returns the reset function
 */
export declare const addRoute: (env: RouteInitEnvironment) => (clientIp: string, code: string, newPassword: string) => Promise<DbUserAccountDetails>;
export default addRoute;
//# sourceMappingURL=auth-reset-password.d.ts.map