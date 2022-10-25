import { QueryOperator } from 'acebase-core/dist/types/data-reference';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
declare type AceBaseLogLine = {
    action: string;
    ip: string;
    date: string;
};
export declare type RequestQuery = {
    take?: string;
    skip?: string;
    sort?: 'date';
    filter_col?: string;
    filter_op?: QueryOperator;
    filter_val?: string;
};
export declare type RequestBody = null;
export declare type ResponseBody = AceBaseLogLine[];
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=meta-logs.d.ts.map