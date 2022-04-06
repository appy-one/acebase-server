import { ID, Transport } from 'acebase-core';
import { RouteInitEnvironment, RouteRequest } from './shared/env';
import { sendUnauthorizedError, sendUnexpectedError } from './shared/error';

export type StartRequestQuery = null;
export type StartRequestBody = {
    path: string;
};
export type StartResponseBody = { id: string; value: { map: any; val: any } }   // 200
    | { code: string, message: string }                                         // 403 
    | { code: 'unexpected', message: string };                                  // 500
export type StartRequest = RouteRequest<any, StartResponseBody, StartRequestBody, StartRequestQuery>;

export type FinishRequestQuery = null;
export type FinishRequestBody = {
    path: string;
    id: string;
    value: {
        map: any;
        val: any;
    }
};
export type FinishResponseBody = 'done'     // 200
    | 'transaction not found'               // 410
    | { code: string, message: string }     // 403
    | string                                // 500

export type FinishRequest = RouteRequest<any, FinishResponseBody, FinishRequestBody, FinishRequestQuery>;


export const addRoutes = (env: RouteInitEnvironment) => {

    const _transactions = new Map<string, { id: string; started: number; path: string; context: any; finish?: (val: any) => Promise<any> }>();

    // Start transaction endpoint:
    env.app.post(`/transaction/${env.db.name}/start`, (req: StartRequest, res) => {
        const data = req.body;
        const access = env.rules.userHasAccess(req.user, data.path, true);
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }

        // Start transaction
        const tx = {
            id: ID.generate(),
            started: Date.now(),
            path: data.path,
            context: req.context,
            finish: undefined
        };
        _transactions.set(tx.id, tx);

        try {
            env.debug.verbose(`Transaction ${tx.id} starting...`);
            // const ref = db.ref(tx.path);
            const donePromise = env.db.api.transaction(tx.path, val => {
                env.debug.verbose(`Transaction ${tx.id} started with value: `, val);
                const currentValue = Transport.serialize(val);
                const promise = new Promise((resolve) => {
                    tx.finish = (val: any) => {
                        env.debug.verbose(`Transaction ${tx.id} finishing with value: `, val);
                        resolve(val);
                        return donePromise;
                    };
                });
                res.send({ id: tx.id, value: currentValue });
                return promise;
            }, { context: tx.context });
        }
        catch (err) {
            sendUnexpectedError(res, err);
        }
    });

    // Finish transaction endpoint:
    env.app.post(`/transaction/${env.db.name}/finish`, async (req: FinishRequest, res) => {
        const data = req.body;

        const tx = _transactions.get(data.id);
        if (!tx) {
            res.statusCode = 410; // Gone
            res.send(`transaction not found`);
            return;
        }
        _transactions.delete(data.id);

        const access = env.rules.userHasAccess(req.user, data.path, true);
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }

        // Finish transaction
        try {
            const newValue = Transport.deserialize(data.value);
            await tx.finish(newValue);
            res.send('done');
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err.message);
        }
    });    

};

export default addRoutes;