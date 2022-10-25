import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = null;
export declare type RequestBody = {
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
export declare type ResponseBody = {
    val: {
        count: number;
        list: any[];
    };
    map?: any;
};
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=data-query.d.ts.map