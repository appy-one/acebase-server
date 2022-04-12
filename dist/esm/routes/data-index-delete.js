import { sendError, sendUnauthorizedError } from '../shared/error.js';
export const addRoute = (env) => {
    env.app.post(`/index/${env.db.name}/delete`, async (req, res) => {
        // Delete an index
        if (!req.user || req.user.username !== 'admin') {
            return sendUnauthorizedError(res, 'admin_only', 'only admin can perform index operations');
        }
        try {
            const data = req.body;
            if (!data.fileName) {
                throw new Error('fileName not given');
            }
            await env.db.indexes.delete(data.fileName); // Requires newer acebase & acebase-core packages
            res.contentType('application/json').send({ success: true });
        }
        catch (err) {
            env.debug.error(`failed to perform index action`, err);
            sendError(res, err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=data-index-delete.js.map