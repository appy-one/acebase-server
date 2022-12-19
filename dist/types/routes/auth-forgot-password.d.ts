import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare class ForgotPasswordError extends Error {
    code: 'server_email_config' | 'invalid_details' | 'invalid_email';
    constructor(code: 'server_email_config' | 'invalid_details' | 'invalid_email', message: string);
}
export declare type RequestQuery = never;
export declare type RequestBody = {
    email: string;
};
export declare type ResponseBody = 'OK' | {
    code: string;
    message: string;
};
export declare type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=auth-forgot-password.d.ts.map