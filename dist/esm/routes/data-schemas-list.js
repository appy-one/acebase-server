import adminOnly from '../middleware/admin-only.js';
import { sendError } from '../shared/error.js';
export const addRoute = (env) => {
    env.app.get(`/schema/${env.db.name}`, adminOnly(env), async (req, res) => {
        // Get all defined schemas
        try {
            const schemas = await env.db.schema.all();
            res.contentType('application/json').send(schemas.map(schema => ({
                path: schema.path,
                schema: typeof schema.schema === 'string' ? schema.schema : schema.text,
                text: schema.text,
            })));
        }
        catch (err) {
            sendError(res, err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=data-schemas-list.js.map