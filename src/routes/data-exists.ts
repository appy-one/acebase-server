import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendUnauthorizedError } from '../shared/error';

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = { exists: boolean };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.app.get(`/exists/${env.db.name}/*`, async (req: Request, res) => {
        // Exists query
        const path = req.path.slice(env.db.name.length + 9);
        const access = await env.rules.isOperationAllowed(req.user, path, 'exists');
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }

        try {
            const exists = await env.db.ref(path).exists();
            res.send({ exists });
        }
        catch(err) {
            res.statusCode = 500;
            res.send(err);
        }
    });

};

export default addRoute;
