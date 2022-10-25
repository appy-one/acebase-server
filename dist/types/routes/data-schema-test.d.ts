import { ISchemaCheckResult, Transport, IAceBaseSchemaInfo } from 'acebase-core';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = null;
export declare type RequestBody = {
    value: Transport.SerializedValue;
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
//# sourceMappingURL=data-schema-test.d.ts.map