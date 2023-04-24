import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendUnauthorizedError } from '../shared/error';

export type RequestQuery = {
    format?: 'json';
    suppress_events?: '0'|'1'
};
export type RequestBody = null;
export type ResponseBody = { success: boolean; reason?: string };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.router.post(`/import/${env.db.name}/*`, async (req: Request, res) => {
        // Import API
        const path = req.path.slice(env.db.name.length + 9);
        const access = await env.rules.isOperationAllowed(req.user, path, 'import');
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }
        const format = req.query.format || 'json';
        const suppress_events = req.query.suppress_events === '1';

        req.pause(); // Switch to non-flowing mode so we can use .read() upon request
        let eof = false;
        req.once('end', () => { eof = true; });
        const read = async (length: number) => {
            let chunk = req.read();
            if (chunk === null && !eof) {
                await new Promise(resolve => req.once('readable', resolve));
                chunk = req.read();
            }
            // env.debug.verbose(`Received chunk: `, chunk);
            return chunk;
        };

        const ref = env.db.ref(path);
        try {
            await ref.import(read, { format, suppress_events });
            res.send({ success: true });
        }
        catch (err) {
            env.debug.error(`Error importing data for path "/${path}": `, err);
            if (!res.headersSent) {
                res.statusCode = 500;
                res.send({ success: false, reason: err.message });
            }
        }
        finally {
            res.end();
        }
    });

};

export default addRoute;
