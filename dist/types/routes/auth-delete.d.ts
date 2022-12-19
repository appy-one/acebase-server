import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare class DeleteError extends Error {
    code: 'unauthenticated_delete' | 'unauthorized_delete';
    constructor(code: 'unauthenticated_delete' | 'unauthorized_delete', message: string);
}
export declare type RequestQuery = never;
export declare type RequestBody = {
    uid: string;
};
export declare type ResponseBody = 'Farewell' | {
    code: DeleteError['code'];
    message: string;
};
export declare type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=auth-delete.d.ts.map