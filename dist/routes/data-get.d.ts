import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = {
    include?: string;
    exclude?: string;
    child_objects?: boolean;
};
export declare type RequestBody = null;
export declare type ResponseBody = {
    exists: boolean;
    val: any;
    map: any;
};
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
