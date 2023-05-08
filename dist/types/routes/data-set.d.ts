import { Transport } from 'acebase-core';
import { RuleValidationFailCode } from '../rules';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare class SetDataError extends Error {
    code: 'invalid_serialized_value';
    constructor(code: 'invalid_serialized_value', message: string);
}
export type RequestQuery = null;
export type RequestBody = Transport.SerializedValue;
export type ResponseBody = {
    success: true;
} | {
    code: 'invalid_serialized_value';
    message: string;
} | {
    code: RuleValidationFailCode;
    message: string;
} | {
    code: 'schema_validation_failed';
    message: string;
} | {
    code: string;
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=data-set.d.ts.map