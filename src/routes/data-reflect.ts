import { IReflectionChildrenInfo, IReflectionNodeInfo, PathInfo } from 'acebase-core';
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
export type Request = RouteRequest<any, ResponseBody, RequestBody, RequestQuery>;

export const addRoute = (env: RouteInitEnvironment) => {

    env.app.get(`/reflect/${env.db.name}/*`, async (req: Request, res) => {
        // Reflection API
        const path = req.path.slice(env.db.name.length + 10);
        const access = env.rules.userHasAccess(req.user, path, false);
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }
        const impersonatedAccess = {
            uid: req.user?.uid !== 'admin' ? null : req.query.impersonate,
            read: {
                allow: false,
                error: null
            },
            write: {
                allow: false,
                error: null
            }
        };
        const impersonatedUser = impersonatedAccess.uid === 'anonymous' ? null : { uid: impersonatedAccess.uid };
        if (impersonatedAccess.uid) {
            const readAccess = env.rules.userHasAccess(impersonatedUser, path, false);
            impersonatedAccess.read.allow = readAccess.allow;
            if (!readAccess.allow) {
                impersonatedAccess.read.error = { code: readAccess.code, message: readAccess.message };
            }
            const writeAccess = env.rules.userHasAccess(impersonatedUser, path, true);
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
                list && list.forEach(childInfo => {
                    childInfo.access = {
                        read: env.rules.userHasAccess(impersonatedUser, PathInfo.getChildPath(path, childInfo.key), false).allow,
                        write: env.rules.userHasAccess(impersonatedUser, PathInfo.getChildPath(path, childInfo.key), true).allow
                    };
                });
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