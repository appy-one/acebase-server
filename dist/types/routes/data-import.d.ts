import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = {
    format?: 'json';
    suppress_events?: '0' | '1';
};
export declare type RequestBody = null;
export declare type ResponseBody = {
    success: boolean;
    reason?: string;
};
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
