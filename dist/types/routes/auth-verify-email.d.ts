import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare class VerifyEmailError extends Error {
    code: 'invalid_code' | 'unknown_user';
    constructor(code: 'invalid_code' | 'unknown_user', message: string);
}
export declare type RequestQuery = {};
export declare type RequestBody = {
    code: string;
};
export declare type ResponseBody = 'OK' | {
    code: string;
    message: string;
};
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
/**
 * Adds the verify_email route and returns the verification function that can be used to manually verify an email address
 * @param env environment
 * @returns returns the verification function
 */
export declare const addRoute: (env: RouteInitEnvironment) => (clientIp: string, code: string) => Promise<void>;
export default addRoute;
