import { RouteInitEnvironment, RouteRequest } from '../shared/env';

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = 'pong';
export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

export const addRoute = (env: RouteInitEnvironment) => {
    env.app.get(`/ping/${env.db.name}`, (req: Request, res) => {
        // For simple connectivity check
        res.send('pong');
    });
};

export default addRoute;