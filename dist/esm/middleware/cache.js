export const addMiddleware = (env) => {
    env.app.use((req, res, next) => {
        // Disable cache for GET requests to make sure browsers do not use cached responses
        if (req.method === 'GET') {
            res.setHeader('Cache-Control', 'no-cache');
        }
        next();
    });
};
export default addMiddleware;
//# sourceMappingURL=cache.js.map