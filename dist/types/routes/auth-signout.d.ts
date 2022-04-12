import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = {};
export declare type RequestBody = {
    client_id?: string;
} & {
    everywhere: boolean;
};
export declare type ResponseBody = 'Bye!' | {
    code: string;
    message: string;
};
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
