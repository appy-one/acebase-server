import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare class ChangePasswordError extends Error {
    code: 'unknown_uid' | 'wrong_password' | 'wrong_access_token';
    constructor(code: 'unknown_uid' | 'wrong_password' | 'wrong_access_token', message: string);
}
export declare type RequestQuery = never;
export declare type RequestBody = {
    uid: string;
    password: string;
    new_password: string;
};
export declare type ResponseBody = {
    access_token: string;
} | {
    code: string;
    message: string;
} | string;
export declare type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=auth-change-password.d.ts.map