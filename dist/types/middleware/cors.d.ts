import { RouteInitEnvironment } from '../shared/env';
/**
 * Gets CORS options that are compatible with the 'cors' package (used by Socket.IO 3+)
 * @param allowedOrigins
 * @returns
 */
export declare const getCorsOptions: (allowedOrigins: string) => {
    origin: boolean | string[];
    methods: string;
    allowedHeaders: string;
};
/**
 * Gets CORS headers that can be sent in preflight (OPTIONS) requests
 * @param allowedOrigins configured allowed origin(s). Examples: `'https://my.server.com'` for a specific allowed origin, `'*'` for any origin (returns current origin), `''` to disable CORS (only allows localhost), or `'http://server1.com,https://server1.com,https://server2.com'` for multiple allowed origins
 * @param currentOrigin current origin from request headers
 * @returns
 */
export declare const getCorsHeaders: (allowedOrigins: string, currentOrigin: string) => {
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Methods': string;
    'Access-Control-Allow-Headers': string;
    'Access-Control-Expose-Headers': string;
};
export declare const addMiddleware: (env: RouteInitEnvironment) => void;
export default addMiddleware;
//# sourceMappingURL=cors.d.ts.map