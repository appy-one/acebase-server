import { RouteInitEnvironment, RouteRequest } from '../shared/env';

type SimpleAceBaseStorageStats = {
    writes: number;
    reads: number;
    bytesRead: number;
    bytesWritten: number;
};

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = SimpleAceBaseStorageStats;
export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.app.get(`/stats/${env.db.name}`, async (req: Request, res) => {
        // Get database stats
        try {
            const stats = await env.db.api.stats() as SimpleAceBaseStorageStats;
            res.send(stats);
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err.message);
        }
    });

};

export default addRoute;