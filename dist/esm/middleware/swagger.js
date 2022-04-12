export const addMiddleware = (env) => {
    env.app.use((req, res, next) => {
        // Swagger UI escapes path variables, so "some/path" in a path variable of an endpoint becomes "some%2Fpath". This middleware fixes that
        if (req.url.includes('%2F')) {
            const url = req.url;
            req.url = req.url.replace(/\%2F/g, '/');
            env.debug.warn(`API: replacing escaped slashes in request path for Swagger UI: ${url} -> ${req.url}`);
        }
        next();
    });
};
export default addMiddleware;
//# sourceMappingURL=swagger.js.map