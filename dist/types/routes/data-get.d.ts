import { SerializedValue } from 'acebase-core/types/transport';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type RequestQuery = {
    include?: string;
    exclude?: string;
    child_objects?: boolean;
};
export declare type RequestBody = null;
export declare type ResponseBody = SerializedValue & {
    exists: boolean;
};
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
