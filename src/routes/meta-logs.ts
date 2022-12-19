import { AceBase } from 'acebase';
import { QueryOperator } from 'acebase-core/dist/types/data-reference';
import adminOnly from '../middleware/admin-only';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';

type AceBaseLogLine = {
    action: string;
    ip: string;
    date: string;
};

export type RequestQuery = { take?: string; skip?: string; sort?: 'date'; filter_col?: string; filter_op?: QueryOperator; filter_val?: string };
export type RequestBody = null;
export type ResponseBody = AceBaseLogLine[];
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.app.get(`/logs/${env.db.name}`, adminOnly(env), async (req: Request, res) => {
        // Get database logs

        // Create indexes if not there yet
        const db = (env.log.ref as any).db as AceBase;
        const createIndexes = [
            db.indexes.create(env.log.ref.path, 'date'),
        ];
        if (req.query.filter_col === 'action') {
            createIndexes.push(db.indexes.create(env.log.ref.path, 'action', { include: ['date'] }));
        }
        if (req.query.filter_col === 'code') {
            createIndexes.push(db.indexes.create(env.log.ref.path, 'code', { include: ['date'] }));
        }
        await Promise.all(createIndexes);

        try {
            const query = env.log.query()
                .take(parseInt(req.query.take ?? '100'))
                .skip(parseInt(req.query.skip ?? '0'))
                .sort(req.query.sort ?? 'date', false);

            if (req.query.filter_col) {
                query.filter(req.query.filter_col, req.query.filter_op, req.query.filter_val);
            }

            const snaps = await query.get();
            const logs = snaps.getValues() as AceBaseLogLine[];
            res.send(logs);
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err.message);
        }
    });

};

export default addRoute;
