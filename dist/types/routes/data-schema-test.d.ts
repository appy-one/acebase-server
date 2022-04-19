import { ISchemaCheckResult } from 'acebase-core';
import type { IAceBaseSchemaInfo } from 'acebase-core/src/api';
import type { SerializedValue } from 'acebase-core/types/transport';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = null;
export declare type RequestBody = {
    value: SerializedValue;
    partial: boolean;
    path?: string;
    schema?: IAceBaseSchemaInfo;
};
export declare type ResponseBody = ISchemaCheckResult | {
    code: 'admin_only';
    message: string;
} | {
    code: 'unexpected';
    message: string;
};
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
