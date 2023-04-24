import { RouteInitEnvironment } from '../shared/env';

/**
 * Gets CORS options that are compatible with the 'cors' package (used by Socket.IO 3+)
 * @param allowedOrigins
 * @returns
 */
export const getCorsOptions = (allowedOrigins: string) => {
    return {
        origin: allowedOrigins === '*' ? true : allowedOrigins === '' ? false : allowedOrigins.split(/,\s*/),
        methods: 'GET,PUT,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Authorization, Content-Length, Accept, Origin, X-Requested-With, AceBase-Context',
    };
};

/**
 * Gets CORS headers that can be sent in preflight (OPTIONS) requests
 * @param allowedOrigins configured allowed origin(s). Examples: `'https://my.server.com'` for a specific allowed origin, `'*'` for any origin (returns current origin), `''` to disable CORS (only allows localhost), or `'http://server1.com,https://server1.com,https://server2.com'` for multiple allowed origins
 * @param currentOrigin current origin from request headers
 * @returns
 */
export const getCorsHeaders = (allowedOrigins: string, currentOrigin: string) => {
    const corsOptions = getCorsOptions(allowedOrigins);
    const origins = typeof corsOptions.origin === 'boolean'
        ? corsOptions.origin ? currentOrigin ?? '*' : ''
        : corsOptions.origin instanceof Array ? corsOptions.origin.join(',') : corsOptions.origin;
    return {
        'Access-Control-Allow-Origin': origins,
        'Access-Control-Allow-Methods': corsOptions.methods,
        'Access-Control-Allow-Headers': corsOptions.allowedHeaders,
        'Access-Control-Expose-Headers': 'Date, AceBase-Context',  // Prevent browsers from stripping these headers from the response for programmatic access in cross-origin requests
    };
};

export const addMiddleware = (env: RouteInitEnvironment) => {
    env.router.use((req, res, next) => {
        const headers = getCorsHeaders(env.config.allowOrigin, req.headers.origin);
        for (const name in headers) {
            res.setHeader(name, headers[name]);
        }
        if (req.method === 'OPTIONS') {
            // Return 200 OK
            return res.status(200).end();
        }
        next();
    });
};

export default addMiddleware;
