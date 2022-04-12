import { sendUnauthorizedError } from '../shared/error.js';
export const addRoute = (env) => {
    env.app.get(`/exists/${env.db.name}/*`, async (req, res) => {
        // Exists query
        const path = req.path.slice(env.db.name.length + 9);
        const access = env.rules.userHasAccess(req.user, path, false);
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