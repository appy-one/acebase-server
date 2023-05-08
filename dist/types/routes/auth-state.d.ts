import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { AceBaseUser } from '../schema/user';
export type RequestQuery = never;
export type RequestBody = never;
export type ResponseBody = {
    signed_in: false;
} | {
    signed_in: true;
    user: AceBaseUser;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=auth-state.d.ts.map