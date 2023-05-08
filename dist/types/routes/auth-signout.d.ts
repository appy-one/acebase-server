import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export type RequestQuery = never;
export type RequestBody = {
    client_id?: string;
} & {
    everywhere: boolean;
};
export type ResponseBody = 'Bye!' | {
    code: string;
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=auth-signout.d.ts.map