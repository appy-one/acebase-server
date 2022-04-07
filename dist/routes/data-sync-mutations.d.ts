import { ValueMutation } from 'acebase-core/src/api';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = {
    path?: string;
    for?: Array<{
        path: string;
        events: string[];
    }>;
    cursor?: string;
    timestamp?: number;
};
export declare type RequestBody = null;
export declare type ResponseBody = ValueMutation[] | {
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
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
