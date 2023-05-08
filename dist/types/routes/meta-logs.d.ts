import { QueryOperator } from 'acebase-core/dist/types/data-reference';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
type AceBaseLogLine = {
    action: string;
    ip: string;
    date: string;
};
export type RequestQuery = {
    take?: string;
    skip?: string;
    sort?: 'date';
    filter_col?: string;
    filter_op?: QueryOperator;
    filter_val?: string;
};
export type RequestBody = null;
export type ResponseBody = AceBaseLogLine[];
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=meta-logs.d.ts.map