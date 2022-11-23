import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = {
    format?: 'json';
    type_safe?: '0' | '1';
};
export declare type RequestBody = null;
export declare type ResponseBody = any;
export declare type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=data-export.d.ts.map