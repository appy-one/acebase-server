import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare const TRANSACTION_TIMEOUT_MS = 10000;
export declare type ApiTransactionDetails = {
    id: string;
    value: {
        map?: any;
        val: any;
    };
};
export declare type StartRequestQuery = null;
export declare type StartRequestBody = {
    path: string;
};
export declare type StartResponseBody = ApiTransactionDetails | {
    code: string;
    message: string;
} | {
    code: 'unexpected';
    message: string;
};
export declare type StartRequest = RouteRequest<any, StartResponseBody, StartRequestBody, StartRequestQuery>;
export declare type FinishRequestQuery = null;
export declare type FinishRequestBody = ApiTransactionDetails & {
    path: string;
};
export declare type FinishResponseBody = 'done' | 'transaction not found' | {
    code: string;
    message: string;
} | string;
export declare type FinishRequest = RouteRequest<any, FinishResponseBody, FinishRequestBody, FinishRequestQuery>;
export declare const addRoutes: (env: RouteInitEnvironment) => void;
export default addRoutes;
