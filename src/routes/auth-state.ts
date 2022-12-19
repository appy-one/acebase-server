import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { AceBaseUser, getPublicAccountDetails } from '../schema/user';

export type RequestQuery = never;
export type RequestBody = never;
export type ResponseBody = { signed_in: false } | { signed_in: true; user: AceBaseUser };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {
    env.app.get(`/auth/${env.db.name}/state`, async (req: Request, res) => {
        if (req.user) {
            res.send({ signed_in: true, user: getPublicAccountDetails(req.user) });
        }
        else {
            res.send({ signed_in: false });
        }
    });
};

export default addRoute;
