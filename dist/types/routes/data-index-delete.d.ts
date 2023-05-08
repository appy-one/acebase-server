import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export type RequestQuery = null;
export type RequestBody = {
    fileName: string;
};
export type ResponseBody = {
    success: true;
} | {
    code: 'admin_only';
    message: string;
} | {
    code: 'unexpected';
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=data-index-delete.d.ts.map