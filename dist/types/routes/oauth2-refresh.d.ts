import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export type RequestQuery = {
    provider: string;
    refresh_token: string;
};
export type RequestBody = null;
export type ResponseBody = {
    provider: {
        name: string;
        access_token: string;
        refresh_token: string;
        expires_in: number;
    };
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=oauth2-refresh.d.ts.map