export const addMiddleware = (env) => {
    env.router.use((req, res, next) => {
        // Swagger UI escapes path variables, so "some/path" in a path variable of an endpoint becomes "some%2Fpath". This middleware fixes that
        if (req.path.includes('%2F')) {
            const [url, query] = req.url.split('?');
            const newUrl = url.replace(/\%2F/g, '/') + (query ? `?${query}` : '');
            env.debug.warn(`API: replacing escaped slashes in request path for Swagger UI: ${req.url} -> ${newUrl}`);
            req.url = newUrl;
        }
        next();
    });
};
export default addMiddleware;
//# sourceMappingURL=swagger.js.map