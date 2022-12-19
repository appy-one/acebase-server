import adminOnly from '../middleware/admin-only.js';
import { sendError } from '../shared/error.js';
export const addRoute = (env) => {
    env.app.get(`/schema/${env.db.name}/*`, adminOnly(env), async (req, res) => {
        // Get defined schema for a specifc path
        try {
            const path = req.path.slice(env.db.name.length + 9);
            const schema = await env.db.schema.get(path);
            if (!schema) {
                return res.status(410).send('Not Found');
            }
            res.contentType('application/json').send({
                path: schema.path,
                schema: typeof schema.schema === 'string' ? schema.schema : schema.text,
                text: schema.text,
            });
        }
        catch (err) {
            sendError(res, err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=data-schema-get.js.map