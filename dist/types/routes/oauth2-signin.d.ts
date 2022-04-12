import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = {
    state: string;
    code?: string;
    error?: string;
    error_reason?: string;
    error_description?: string;
};
export declare type RequestBody = null;
export declare type ResponseBody = string | {
    code: 'admin_only';
    message: string;
};
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
