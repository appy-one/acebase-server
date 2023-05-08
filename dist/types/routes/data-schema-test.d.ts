import { ISchemaCheckResult, Transport, IAceBaseSchemaInfo } from 'acebase-core';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export type RequestQuery = null;
export type RequestBody = {
    value: Transport.SerializedValue;
    partial: boolean;
    path?: string;
    schema?: IAceBaseSchemaInfo;
};
export type ResponseBody = ISchemaCheckResult | {
    code: 'admin_only';
    message: string;
} | {
    code: 'unexpected';
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=data-schema-test.d.ts.map