import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export type RequestQuery = {
    state: string;
    code?: string;
    error?: string;
    error_reason?: string;
    error_description?: string;
};
export type RequestBody = null;
export type ResponseBody = string | {
    code: 'admin_only';
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
//# sourceMappingURL=oauth2-signin.d.ts.map