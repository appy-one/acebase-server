import { RouteInitEnvironment, RouteRequest } from '../shared/env';

export const addMiddleware = (env: RouteInitEnvironment) => {

    env.router.use((req: RouteRequest, res, next) => {
        // Disable cache for GET requests to make sure browsers do not use cached responses
        if (req.method === 'GET') {
            res.setHeader('Cache-Control', 'no-cache');
        }
        next();
    });

};

export default addMiddleware;
