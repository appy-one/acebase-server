import { sendError, sendUnauthorizedError } from '../shared/error.js';
export const addRoute = (env) => {
    env.app.get(`/schema/${env.db.name}`, async (req, res) => {
        // Get all defined schemas
        if (!req.user || req.user.username !== 'admin') {
            return sendUnauthorizedError(res, 'admin_only', 'only admin can perform schema operations');
        }
        try {
            const schemas = await env.db.schema.all();
            res.contentType('application/json').send(schemas);
        }
        catch (err) {
            sendError(res, err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=data-schemas-list.js.map