import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export type RequestQuery = {
    format?: 'json';
    suppress_events?: '0' | '1';
};
export type RequestBody = null;
export type ResponseBody = {
    success: boolean;
    reason?: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=data-import.d.ts.map