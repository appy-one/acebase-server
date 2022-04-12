import { getPublicAccountDetails } from '../schema/user.js';
export const addRoute = (env) => {
    env.app.get(`/auth/${env.db.name}/state`, async (req, res) => {
        if (req.user) {
            res.send({ signed_in: true, user: getPublicAccountDetails(req.user) });
        }
        else {
            res.send({ signed_in: false });
        }
    });
};
export default addRoute;
//# sourceMappingURL=auth-state.js.map