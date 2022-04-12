import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { AceBaseUser } from '../schema/user';
export declare type RequestQuery = {};
export declare type RequestBody = {};
export declare type ResponseBody = {
    signed_in: false;
} | {
    signed_in: true;
    user: AceBaseUser;
};
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
