import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type StartRequestQuery = null;
export declare type StartRequestBody = {
    path: string;
};
export declare type StartResponseBody = {
    id: string;
    value: {
        map: any;
        val: any;
    };
} | {
    code: string;
    message: string;
} | {
    code: 'unexpected';
    message: string;
};
export declare type StartRequest = RouteRequest<any, StartResponseBody, StartRequestBody, StartRequestQuery>;
export declare type FinishRequestQuery = null;
export declare type FinishRequestBody = {
    path: string;
    id: string;
    value: {
        map: any;
        val: any;
    };
};
export declare type FinishResponseBody = 'done' | 'transaction not found' | {
    code: string;
    message: string;
} | string;
export declare type FinishRequest = RouteRequest<any, FinishResponseBody, FinishRequestBody, FinishRequestQuery>;
export declare const addRoutes: (env: RouteInitEnvironment) => void;
export default addRoutes;
