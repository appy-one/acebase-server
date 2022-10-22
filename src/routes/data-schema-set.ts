import adminOnly from '../middleware/admin-only';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendError } from '../shared/error';

export type RequestQuery = null;
export type RequestBody = {
    action?: 'set'; // deprecated
    path: string;
    schema: string | Record<string, any>;
};
export type ResponseBody = { success: true }    // 200
    | { code: 'admin_only'; message: string }   // 403
    | { code: 'unexpected'; message: string };  // 500

export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.app.post(`/schema/${env.db.name}`, adminOnly(env), async (req: Request, res) => {
        // defines a schema
        try {
            const data = req.body;
            const { path, schema } = data;
            await env.db.schema.set(path, schema);

            res.contentType('application/json').send({ success: true });
        }
        catch(err) {
            sendError(res, err);
        }
    });    

};

export default addRoute;