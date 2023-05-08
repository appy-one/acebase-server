import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare class ChangePasswordError extends Error {
    code: 'unknown_uid' | 'wrong_password' | 'wrong_access_token';
    constructor(code: 'unknown_uid' | 'wrong_password' | 'wrong_access_token', message: string);
}
export type RequestQuery = never;
export type RequestBody = {
    uid: string;
    password: string;
    new_password: string;
};
export type ResponseBody = {
    access_token: string;
} | {
    code: string;
    message: string;
} | string;
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=auth-change-password.d.ts.map