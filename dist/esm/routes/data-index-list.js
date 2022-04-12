import { sendError, sendUnauthorizedError } from '../shared/error.js';
;
export const addRoute = (env) => {
    env.app.get(`/index/${env.db.name}`, async (req, res) => {
        // Get all indexes
        if (!req.user || req.user.username !== 'admin') {
            return sendUnauthorizedError(res, 'admin_only', 'only admin can perform index operations');
        }
        try {
            const indexes = await env.db.indexes.get();
            res.contentType('application/json').send(indexes.map(index => {
                const { path, key, caseSensitive, textLocale, includeKeys, indexMetadataKeys, type, fileName, description } = index;
                return { path, key, caseSensitive, textLocale, includeKeys, indexMetadataKeys, type, fileName, description };
            }));
        }
        catch (err) {
            sendError(res, err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=data-index-list.js.map