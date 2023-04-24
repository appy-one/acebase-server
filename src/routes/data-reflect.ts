import { IReflectionChildrenInfo, IReflectionNodeInfo, PathInfo } from 'acebase-core';
import { AccessCheckOperation, HasAccessResult } from '../rules';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendUnauthorizedError } from '../shared/error';

export type RequestQuery = { type: 'info'|'children'; impersonate?: string };
export type RequestBody = null;
export type ResponseBody = IReflectionNodeInfo & IReflectionChildrenInfo & { impersonation: {
    uid: string;
    read: {
        allow: boolean;
        error?: { code: string; message: string };
    };
    write: {
        allow: boolean;
        error?: { code: string; message: string };
    };
}};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.router.get(`/reflect/${env.db.name}/*`, async (req: Request, res) => {
        // Reflection API
        const path = req.path.slice(env.db.name.length + 10);
        const access = await env.rules.isOperationAllowed(req.user, path, 'reflect');
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }
        const impersonatedAccess = {
            uid: req.user?.uid !== 'admin' ? null : req.query.impersonate,
            /**
             * NEW, check all possible operations
             */
            operations: {} as Record<AccessCheckOperation, HasAccessResult>,
            /** Result of `get` operation */
            read: {
                allow: false,
                error: null,
            },
            /** Result of `set` operation */
            write: {
                allow: false,
                error: null,
            },
        };
        const impersonatedUser = impersonatedAccess.uid === 'anonymous' ? null : { uid: impersonatedAccess.uid };
        if (impersonatedAccess.uid) {
            for (const operation of ['read','write','transact','get','update','set','delete','reflect','exists','query','import','export'] as AccessCheckOperation[]) {
                const access = await env.rules.isOperationAllowed(impersonatedUser, path, operation);
                impersonatedAccess.operations[operation] = access;
            }
            const readAccess = impersonatedAccess.operations.read; // await env.rules.isOperationAllowed(impersonatedUser, path, 'read');
            impersonatedAccess.read.allow = readAccess.allow;
            if (!readAccess.allow) {
                impersonatedAccess.read.error = { code: readAccess.code, message: readAccess.message };
            }
            const writeAccess = impersonatedAccess.operations.write; // await env.rules.isOperationAllowed(impersonatedUser, path, 'write');
            impersonatedAccess.write.allow = writeAccess.allow;
            if (!writeAccess.allow) {
                impersonatedAccess.write.error = { code: writeAccess.code, message: writeAccess.message };
            }
        }
        const type = req.query.type;
        const args = {};
        Object.keys(req.query).forEach(key => {
            if (!['type','impersonate'].includes(key)) {
                let val = req.query[key];
                if (/^(?:true|false|[0-9]+)$/.test(val)) { val = JSON.parse(val); }
                args[key] = val;
            }
        });

        try {
            const result: ResponseBody = await (env.db.ref(path).reflect as (type: string, args: any) => any)(type, args);
            if (impersonatedAccess.uid) {
                result.impersonation = impersonatedAccess;
                let list;
                if (type === 'children') {
                    list = result.list;
                }
                else if (type === 'info') {
                    list = typeof result.children === 'object' && 'list' in result.children ? result.children.list : [];
                }
                for (const childInfo of list ?? []) {
                    childInfo.access = {
                        read: (await env.rules.isOperationAllowed(impersonatedUser, PathInfo.getChildPath(path, childInfo.key), 'read')).allow,
                        write: (await env.rules.isOperationAllowed(impersonatedUser, PathInfo.getChildPath(path, childInfo.key), 'write')).allow,
                    };
                }
            }
            res.send(result);
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    });

};

export default addRoute;
