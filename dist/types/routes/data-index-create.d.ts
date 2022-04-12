import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export declare type FullTextIndexOptions = {
    type: 'fulltext';
    config?: {
        /** Callback function that transforms (and/or filters) words being indexed _and_ queried */
        transform?: (locale: string, word: string) => string;
        /** Also known as a stoplist. Array of words to automatically be ignored for indexing and querying. */
        blacklist?: string[];
        /** Words to be included if they did not match minLength and/or blacklist criteria */
        whitelist?: string[];
        /** Only use words with a minimum length */
        minLength?: number;
        /** Only use words with a maximum length */
        maxLength?: number;
        /** Specify a key in the data that contains the locale of the indexed texts. This allows multiple languages to be indexed using their own rules. */
        localeKey?: string;
        /** Boolean value that specifies whether a default stoplist for the used locale should be used to automatically blacklist words. Currently only available for locale "en", which contains very frequently used words like "a", "i", "me", "it", "the", "they", "them" etc. */
        useStoplist?: boolean;
    };
};
export declare type GeoIndexOptions = {
    type: 'geo';
};
export declare type ArrayIndexOptions = {
    type: 'array';
};
export declare type CreateIndexRequest = {
    path: string;
    key: string;
    options?: {
        type?: 'normal' | 'array' | 'fulltext' | 'geo';
        rebuild?: boolean;
        textLocale?: string;
        include?: string[];
        config?: {};
    } & ({} | FullTextIndexOptions | GeoIndexOptions | ArrayIndexOptions);
};
export declare type RequestQuery = null;
export declare type RequestBody = CreateIndexRequest;
export declare type ResponseBody = {
    success: true;
} | {
    code: 'admin_only';
    message: string;
} | {
    code: 'unexpected';
    message: string;
};
export declare type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
