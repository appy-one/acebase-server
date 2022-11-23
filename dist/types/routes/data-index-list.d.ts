import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export interface PublicDataIndex {
    path: string;
    key: string;
    caseSensitive: boolean;
    textLocale: string;
    includeKeys: string[];
    indexMetadataKeys: string[];
    type: "normal" | "array" | "fulltext" | "geo";
    fileName: string;
    description: string;
}
export declare type RequestQuery = null;
export declare type RequestBody = null;
export declare type ResponseBody = PublicDataIndex[] | {
    code: string;
    message: string;
};
export declare type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=data-index-list.d.ts.map