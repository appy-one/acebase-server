import { DataIndex } from 'acebase-core';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendError, sendUnauthorizedError } from '../shared/error';

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = DataIndex[] | { code: string; message: string };
export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.app.get(`/index/${env.db.name}`, async (req: Request, res) => {
        // Get all indexes
        if (!req.user || req.user.username !== 'admin') {
            return sendUnauthorizedError(res, 'admin_only', 'only admin can perform index operations');
        }

        try {
            const indexes = await env.db.indexes.get();
            res.contentType('application/json').send(indexes);
        }
        catch (err) {
            sendError(res, err);
        }
    });

};

export default addRoute;