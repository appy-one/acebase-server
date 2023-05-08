import { RouteInitEnvironment, RouteRequest } from '../shared/env';
type SimpleAceBaseStorageStats = {
    writes: number;
    reads: number;
    bytesRead: number;
    bytesWritten: number;
};
export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = SimpleAceBaseStorageStats;
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=meta-stats.d.ts.map