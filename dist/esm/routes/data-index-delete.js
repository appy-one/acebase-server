import adminOnly from '../middleware/admin-only.js';
import { sendError } from '../shared/error.js';
export const addRoute = (env) => {
    env.router.post(`/index/${env.db.name}/delete`, adminOnly(env), async (req, res) => {
        // Delete an index
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