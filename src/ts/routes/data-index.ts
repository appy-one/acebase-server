import { RouteInitEnvironment, RouteRequest } from './shared/env';
import { sendError, sendUnauthorizedError } from './shared/error';

export type RequestQuery = null;
export type RequestBody = {
    action: 'create' // TODO: |'rebuild'|'remove'
    path: string;
    key: string;
    options: any;
};
export type ResponseBody = { success: true }    // 200
    | { code: 'admin_only'; message: string }   // 403
    | { code: 'unexpected'; message: string };  // 500 (TODO check if 400 is also possible)

export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.app.post(`/index/${env.db.name}`, async (req: Request, res) => {
        // create / remove / rebuild index
        if (!req.user || req.user.username !== 'admin') {
            return sendUnauthorizedError(res, 'admin_only', 'only admin can perform index operations');
        }

        try {
            const data = req.body;
            if (data.action === 'create') {
                await env.db.indexes.create(data.path, data.key, data.options)
            }
            // else if (data.action === 'rebuild') {
            //     // TODO
            // }
            // else if (data.action === 'remove') {
            //     // TODO
            // }
            else {
                throw new Error('Invalid action');
            }
            res.contentType('application/json').send({ success: true });
        }
        catch(err) {
            env.debug.error(`failed to perform index action`, err);
            sendError(res, err);
        }
    });

};

export default addRoute;