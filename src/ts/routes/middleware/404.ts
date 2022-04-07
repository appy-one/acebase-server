import { RouteInitEnvironment } from "../shared/env";

/**
 * Adds 404 middleware. Add this as very last handler!
 * @param env
 */
export const addMiddleware = (env: RouteInitEnvironment) => {
    env.app.use((req, res, next) => {
        res.status(404).send('Not Found');
    });
};

export default addMiddleware;