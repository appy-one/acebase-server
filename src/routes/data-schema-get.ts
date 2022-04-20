import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendError, sendUnauthorizedError } from '../shared/error';

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = 
    { path: string; schema: string; text: string }   // 200
    | 'Not Found';                                   // 410

export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.app.get(`/schema/${env.db.name}/*`, async (req: Request, res) => {
        // Get defined schema for a specifc path
        if (!req.user || req.user.username !== 'admin') {
            return sendUnauthorizedError(res, 'admin_only', 'only admin can perform schema operations');
        }
        try {
            const path = req.path.slice(env.db.name.length + 9);
            const schema = await env.db.schema.get(path);
            if (!schema) {
                return res.status(410).send('Not Found');
            }
            res.contentType('application/json').send({
                path: schema.path,
                schema: typeof schema.schema === 'string' ? schema.schema : schema.text,
                text: schema.text
            });
        }
        catch(err) {
            sendError(res, err);
        }
    });

};

export default addRoute;