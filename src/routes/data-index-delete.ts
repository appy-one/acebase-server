import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendError, sendUnauthorizedError } from '../shared/error';

export type RequestQuery = null;
export type RequestBody = {
    fileName: string;
};
export type ResponseBody = { success: true }    // 200
    | { code: 'admin_only'; message: string }   // 403
    | { code: 'unexpected'; message: string };  // 500 (TODO check if 400 is also possible)

export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.app.post(`/index/${env.db.name}/delete`, async (req: Request, res) => {
        // Delete an index
        if (!req.user || req.user.username !== 'admin') {
            return sendUnauthorizedError(res, 'admin_only', 'only admin can perform index operations');
        }

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