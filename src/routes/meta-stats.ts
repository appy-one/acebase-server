import { RouteInitEnvironment, RouteRequest } from '../shared/env';

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = any;
export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.app.get(`/stats/${env.db.name}`, async (req: Request, res) => {
        // Get database stats
        try {
            const stats = await env.db.api.stats();
            res.send(stats);
        }
        catch(err) {
            res.statusCode = 500;
            res.send(err);
        }
    });

};

export default addRoute;