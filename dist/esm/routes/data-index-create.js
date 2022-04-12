import { sendError, sendUnauthorizedError } from '../shared/error.js';
export const addRoute = (env) => {
    const handleRequest = async (req, res) => {
        if (!req.user || req.user.username !== 'admin') {
            return sendUnauthorizedError(res, 'admin_only', 'only admin can perform index operations');
        }
        try {
            const data = req.body;
            await env.db.indexes.create(data.path, data.key, data.options);
            res.contentType('application/json').send({ success: true });
        }
        catch (err) {
            env.debug.error(`failed to perform index action`, err);
            sendError(res, err);
        }
    };
    env.app.post(`/index/${env.db.name}`, async (req, res) => {
        // Legacy endpoint that was designed to handle multiple actions
        // The only action ever implemented was 'create', so we'll handle that here
        if (req.body?.action !== 'create') {
            return sendError(res, { code: 'invalid_action', message: 'Invalid action' });
        }
        handleRequest(req, res);
    });
    env.app.post(`/index/${env.db.name}/create`, async (req, res) => {
        // New dedicated create endpoint
        handleRequest(req, res);
    });
};
export default addRoute;
//# sourceMappingURL=data-index-create.js.map