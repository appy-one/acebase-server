import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = null;
export declare type RequestBody = {
    action?: 'set';
    path: string;
    schema: string | Record<string, any>;
};
export declare type ResponseBody = {
    success: true;
} | {
    code: 'admin_only';
    message: string;
} | {
    code: 'unexpected';
    message: string;
};
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=data-schema-set.d.ts.map