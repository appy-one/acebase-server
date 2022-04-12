/**
 * Adds 404 middleware. Add this as very last handler!
 * @param env
 */
export const addMiddleware = (env) => {
    env.app.use((req, res, next) => {
        res.status(404).send('Not Found');
    });
};
export default addMiddleware;
//# sourceMappingURL=404.js.map