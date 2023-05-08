import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = {
    path: string;
    schema: string;
    text: string;
} | 'Not Found';
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=data-schema-get.d.ts.map