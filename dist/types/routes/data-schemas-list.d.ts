import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = null;
export declare type RequestBody = null;
export declare type ResponseBody = {
    path: string;
    schema: string;
    text: string;
}[];
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
