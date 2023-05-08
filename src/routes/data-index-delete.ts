import adminOnly from '../middleware/admin-only';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendError } from '../shared/error';

export type RequestQuery = null;
export type RequestBody = {
    fileName: string;
};
export type ResponseBody = { success: true }    // 200
    | { code: 'admin_only'; message: string }   // 403
    | { code: 'unexpected'; message: string };  // 500 (TODO check if 400 is also possible)

export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.router.post(`/index/${env.db.name}/delete`, adminOnly(env), async (req: Request, res) => {
        // Delete an index
        try {
            const data = req.body;
            if (!data.fileName) {
                throw new Error('fileName not given');
            }

            await env.db.indexes.delete(data.fileName); // Requires newer acebase & acebase-core packages
            res.contentType('application/json').send({ success: true });
        }
        catch(err) {
            env.debug.error(`failed to perform index action`, err);
            sendError(res, err);
        }
    });

};

export default addRoute;
