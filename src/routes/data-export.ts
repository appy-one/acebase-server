import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendUnauthorizedError } from '../shared/error';

export type RequestQuery = {
    format?: 'json';
    type_safe?: '0'|'1'
};
export type RequestBody = null;
export type ResponseBody = any;
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.router.get(`/export/${env.db.name}/*`, async (req: Request, res) => {
        // Export API
        const path = req.path.slice(env.db.name.length + 9);
        const access = await env.rules.isOperationAllowed(req.user, path, 'export');
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }
        const format = req.query.format || 'json';
        const type_safe = req.query.type_safe !== '0';

        const write = async (chunk) => {
            const ok = res.write(chunk);
            if (!ok) {
                await new Promise(resolve => res.once('drain', resolve));
            }
        };

        const ref = env.db.ref(path);
        res.setHeader('Content-Disposition', `attachment; filename=${ref.key || 'export'}.json`); // Will be treated as a download in browser

        try {
            await ref.export(write, { format, type_safe });
        }
        catch (err) {
            env.debug.error(`Error exporting data for path "/${path}": `, err);
            if (!res.headersSent) {
                res.statusCode = 500;
                res.send(err);
            }
        }
        finally {
            res.end();
        }
    });

};

export default addRoute;
