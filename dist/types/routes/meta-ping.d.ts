import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = null;
export declare type RequestBody = null;
export declare type ResponseBody = 'pong';
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=meta-ping.d.ts.map