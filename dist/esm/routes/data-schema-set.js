import adminOnly from '../middleware/admin-only.js';
import { sendError } from '../shared/error.js';
export const addRoute = (env) => {
    env.router.post(`/schema/${env.db.name}`, adminOnly(env), async (req, res) => {
        // defines a schema
        try {
            const data = req.body;
            const { path, schema } = data;
            await env.db.schema.set(path, schema);
            res.contentType('application/json').send({ success: true });
        }
        catch (err) {
            sendError(res, err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=data-schema-set.js.map