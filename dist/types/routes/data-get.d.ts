import { Transport } from 'acebase-core';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = {
    include?: string;
    exclude?: string;
    child_objects?: boolean;
};
export declare type RequestBody = null;
export declare type ResponseBody = Transport.SerializedValue & {
    exists: boolean;
};
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=data-get.d.ts.map