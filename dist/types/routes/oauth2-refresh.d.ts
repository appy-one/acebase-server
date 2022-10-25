import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = {
    provider: string;
    refresh_token: string;
};
export declare type RequestBody = null;
export declare type ResponseBody = {
    provider: {
        name: string;
        access_token: string;
        refresh_token: string;
        expires_in: number;
    };
};
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=oauth2-refresh.d.ts.map