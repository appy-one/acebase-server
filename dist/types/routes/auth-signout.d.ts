import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = never;
export declare type RequestBody = {
    client_id?: string;
} & {
    everywhere: boolean;
};
export declare type ResponseBody = 'Bye!' | {
    code: string;
    message: string;
};
export declare type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=auth-signout.d.ts.map