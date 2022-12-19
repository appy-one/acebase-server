"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMiddleware = exports.getCorsHeaders = exports.getCorsOptions = void 0;
/**
 * Gets CORS options that are compatible with the 'cors' package (used by Socket.IO 3+)
 * @param allowedOrigins
 * @returns
 */
const getCorsOptions = (allowedOrigins) => {
    return {
        origin: allowedOrigins === '*' ? true : allowedOrigins === '' ? false : allowedOrigins.split(/,\s*/),
        methods: 'GET,PUT,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Authorization, Content-Length, Accept, Origin, X-Requested-With, AceBase-Context',
    };
};
exports.getCorsOptions = getCorsOptions;
/**
 * Gets CORS headers that can be sent in preflight (OPTIONS) requests
 * @param allowedOrigins configured allowed origin(s). Examples: `'https://my.server.com'` for a specific allowed origin, `'*'` for any origin (returns current origin), `''` to disable CORS (only allows localhost), or `'http://server1.com,https://server1.com,https://server2.com'` for multiple allowed origins
 * @param currentOrigin current origin from request headers
 * @returns
 */
const getCorsHeaders = (allowedOrigins, currentOrigin) => {
    const corsOptions = (0, exports.getCorsOptions)(allowedOrigins);
    const origins = typeof corsOptions.origin === 'boolean'
        ? corsOptions.origin ? currentOrigin !== null && currentOrigin !== void 0 ? currentOrigin : '*' : ''
        : corsOptions.origin instanceof Array ? corsOptions.origin.join(',') : corsOptions.origin;
    return {
        'Access-Control-Allow-Origin': origins,
        'Access-Control-Allow-Methods': corsOptions.methods,
        'Access-Control-Allow-Headers': corsOptions.allowedHeaders,
        'Access-Control-Expose-Headers': 'Date, AceBase-Context', // Prevent browsers from stripping these headers from the response for programmatic access in cross-origin requests
    };
};
exports.getCorsHeaders = getCorsHeaders;
const addMiddleware = (env) => {
    env.app.use((req, res, next) => {
        const headers = (0, exports.getCorsHeaders)(env.config.allowOrigin, req.headers.origin);
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
exports.addMiddleware = addMiddleware;
exports.default = exports.addMiddleware;
//# sourceMappingURL=cors.js.map