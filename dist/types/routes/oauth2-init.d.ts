import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = {
    provider: string;
    callbackUrl: string;
    [option_name: string]: string;
};
export declare type RequestBody = null;
export declare type ResponseBody = {
    redirectUrl: string;
};
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=oauth2-init.d.ts.map