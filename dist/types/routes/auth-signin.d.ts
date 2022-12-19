import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { AceBaseUser } from '../schema/user';
export declare type RequestQuery = never;
export declare type RequestBody = {
    client_id?: string;
} & ({
    method: 'token';
    access_token: string;
} | {
    method: 'email';
    email: string;
    password: string;
} | {
    method: 'account';
    username: string;
    password: string;
});
export declare type ResponseBody = {
    access_token: string;
    user: AceBaseUser;
};
export declare type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=auth-signin.d.ts.map