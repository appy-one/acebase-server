import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendError, sendUnauthorizedError } from '../shared/error';

export type RequestQuery = null;
export type RequestBody = {
    action: 'set';
    path: string;
    schema: string|Object;
};
export type ResponseBody = { success: true }    // 200
    | { code: 'admin_only'; message: string }   // 403
    | { code: 'unexpected'; message: string };  // 500

export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.app.post(`/schema/${env.db.name}`, async (req: Request, res) => {
        // defines a schema
        if (!req.user || req.user.username !== 'admin') {
            return sendUnauthorizedError(res, 'admin_only', 'only admin can perform schema operations');
        }

        try {
            const data = req.body;
            if (data.action === 'set') {
                const { path, schema } = data;
                await env.db.schema.set(path, schema);
            }
            else {
                throw new Error(`Invalid action`);
            }
            res.contentType('application/json').send({ success: true });
        }
        catch(err) {
            sendError(res, err);
        }
    });    

};

export default addRoute;