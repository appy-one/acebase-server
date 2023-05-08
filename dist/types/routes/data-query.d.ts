import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export type RequestQuery = null;
export type RequestBody = {
    map: any;
    val: {
        query: {
            /** result filters */
            filters: Array<{
                key: string;
                op: string;
                compare: any;
            }>;
            /** number of results to skip, useful for paging */
            skip: number;
            /** max number of results to return */
            take: number;
            /** sort order */
            order: Array<{
                key: string;
                ascending: boolean;
            }>;
        };
        /** client's query id for realtime event notifications through the websocket */
        query_id?: string;
        /** client's socket id for realtime event notifications through websocket */
        client_id?: string;
        options: {
            snapshots?: boolean;
            monitor?: boolean | {
                add: boolean;
                change: boolean;
                remove: boolean;
            };
            include?: string[];
            exclude?: string[];
            child_objects?: boolean;
        };
    };
};
export type ResponseBody = {
    val: {
        count: number;
        list: any[];
    };
    map?: any;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=data-query.d.ts.map