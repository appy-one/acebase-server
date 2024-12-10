import { IReflectionChildrenInfo, IReflectionNodeInfo, PathInfo } from 'acebase-core';
import { AccessCheckOperation, HasAccessResult } from '../rules';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendUnauthorizedError } from '../shared/error';
import { isAdmin } from '../shared/admin';

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
        const access = await env.rules.isOperationAllowed(req.user, path, 'reflect', { context: req.context, type: req.query.type });
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }
        const impersonatedAccess = {
            uid: !isAdmin(req.user) ? null : req.query.impersonate,
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
        const impersonatedData = { context: { acebase_reflect: true }, value: '[[reflect]]' }; // TODO: Make configurable
        if (impersonatedAccess.uid) {
            for (const operation of ['transact','get','update','set','delete','reflect','exists','query','import','export'] as AccessCheckOperation[]) {
                const access = await env.rules.isOperationAllowed(impersonatedUser, path, operation, impersonatedData);
                impersonatedAccess.operations[operation] = access;
            }
            const readAccess = await env.rules.isOperationAllowed(impersonatedUser, path, 'get'); // Use pre-flight 'get' check to mimic legacy 'read' check
            impersonatedAccess.read.allow = readAccess.allow;
            if (!readAccess.allow) {
                impersonatedAccess.read.error = { code: readAccess.code, message: readAccess.message };
            }
            const writeAccess = await env.rules.isOperationAllowed(impersonatedUser, path, 'update'); // Use pre-flight 'update' check to mimic legacy 'write' check
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
                        read: (await env.rules.isOperationAllowed(impersonatedUser, PathInfo.getChildPath(path, childInfo.key), 'get')).allow,        // Use pre-flight 'get' check to mimic legacy 'read' check
                        write: (await env.rules.isOperationAllowed(impersonatedUser, PathInfo.getChildPath(path, childInfo.key), 'update')).allow,    // Use pre-flight 'update' check to mimic legacy 'write' check
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
