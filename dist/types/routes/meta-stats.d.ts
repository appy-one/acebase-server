import { RouteInitEnvironment, RouteRequest } from '../shared/env';
declare type SimpleAceBaseStorageStats = {
    writes: number;
    reads: number;
    bytesRead: number;
    bytesWritten: number;
};
export declare type RequestQuery = null;
export declare type RequestBody = null;
export declare type ResponseBody = SimpleAceBaseStorageStats;
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
