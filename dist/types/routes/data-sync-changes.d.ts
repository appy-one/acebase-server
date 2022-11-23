import { ValueChange } from 'acebase-core';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = {
    path?: string;
    for?: Array<{
        path: string;
        events: string[];
    }>;
    cursor?: string;
    timestamp?: string;
};
export declare type RequestBody = null;
export declare type ResponseBody = ValueChange[] | {
    code: 'no_transaction_logging';
    message: string;
} | {
    code: 'invalid_request';
    message: string;
} | {
    code: 'not_authorized';
    message: string;
} | {
    code: 'unexpected';
    message: string;
};
export declare type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=data-sync-changes.d.ts.map