import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export type RequestQuery = {
    provider: string;
    callbackUrl: string;
    [option_name: string]: string;
};
export type RequestBody = null;
export type ResponseBody = {
    redirectUrl: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=oauth2-init.d.ts.map