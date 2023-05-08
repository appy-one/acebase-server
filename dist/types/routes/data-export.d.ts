import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export type RequestQuery = {
    format?: 'json';
    type_safe?: '0' | '1';
};
export type RequestBody = null;
export type ResponseBody = any;
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=data-export.d.ts.map