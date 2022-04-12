import { sendError, sendUnauthorizedError } from '../shared/error.js';
export const addRoute = (env) => {
    env.app.post(`/schema/${env.db.name}`, async (req, res) => {
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
        catch (err) {
            sendError(res, err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=data-schema-set.js.map