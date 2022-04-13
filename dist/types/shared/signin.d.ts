import { DbUserAccountDetails } from "../schema/user";
import { RouteInitEnvironment, RouteRequest } from "./env";
export declare type SignInCredentials = {
    method: 'token';
    access_token: string;
} | {
    method: 'private_token';
    access_token: string;
} | {
    method: 'email';
    email: string;
    password: string;
} | {
    method: 'account';
    username: string;
    password: string;
};
export declare class SignInError extends Error {
    code: string;
    details: Object;
    constructor(code: string, message: string, details?: Object);
}
/**
 * Signs in a user and logs the request. If successful, adds the user to authCache, binds the user to the http request and returns the user details.
 * Throws a `SignInError` if sign in fails for a known reason.
 * @param credentials credentials to sign in the user with
 * @param env environment state
 * @param req current http request
 * @returns
 */
export declare const signIn: (credentials: SignInCredentials, env: RouteInitEnvironment, req: RouteRequest) => Promise<DbUserAccountDetails>;
