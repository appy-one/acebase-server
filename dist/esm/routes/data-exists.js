import { sendUnauthorizedError } from '../shared/error.js';
export const addRoute = (env) => {
    env.router.get(`/exists/${env.db.name}/*`, async (req, res) => {
        // Exists query
        const path = req.path.slice(env.db.name.length + 9);
        const access = await env.rules.isOperationAllowed(req.user, path, 'exists', { context: req.context });
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }
        try {
            const exists = await env.db.ref(path).exists();
            res.send({ exists });
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=data-exists.js.map