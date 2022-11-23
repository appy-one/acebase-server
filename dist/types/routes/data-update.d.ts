import { Transport } from 'acebase-core';
import { RuleValidationFailCode } from '../rules';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare class UpdateDataError extends Error {
    code: 'invalid_serialized_value';
    constructor(code: 'invalid_serialized_value', message: string);
}
export declare type RequestQuery = null;
export declare type RequestBody = Transport.SerializedValue;
export declare type ResponseBody = {
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
export declare type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=data-update.d.ts.map