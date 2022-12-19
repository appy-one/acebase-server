import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { DbUserAccountDetails } from '../schema/user';
import { sendUnexpectedError } from '../shared/error';

export type RequestQuery = never;
export type RequestBody = { client_id?: string } & {
    everywhere: boolean
};
export type ResponseBody = 'Bye!' | { code: string; message: string };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {
    env.app.post(`/auth/${env.db.name}/signout`, async (req: Request, res) => {

        const LOG_ACTION = 'auth.signout';
        const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null };

        try {
            if (req.user) {
                const client = typeof req.body.client_id === 'string' ? env.clients.get(req.body.client_id) : null; // NEW in AceBaseClient v0.9.4
                if (client) {
                    // Remove user binding from client socket
                    client.user = null;
                }

                const signOutEverywhere = typeof req.body === 'object' && req.body.everywhere === true; // NEW in AceBaseClient v0.9.14
                if (signOutEverywhere) {
                    // Remove token from cache
                    env.authCache.remove(req.user.uid);

                    // Remove user binding from all clients signed in with current user
                    for (const client of env.clients.values()) {
                        if (client.user?.uid === req.user.uid) {
                            client.user = null;
                        }
                    }
                }

                // Remove token from user's auth node
                await env.authRef.child(req.user.uid).transaction(snap => {
                    if (!snap.exists()) { return; }

                    const user: DbUserAccountDetails = snap.val();
                    if (signOutEverywhere) {
                        user.access_token = null;
                    }
                    user.last_signout = new Date();
                    user.last_signout_ip = req.ip;
                    return user;
                });

                env.log.event(LOG_ACTION, LOG_DETAILS);
            }
            res.send('Bye!');
        }
        catch(err) {
            env.log.error(LOG_ACTION, 'unexpected', { ...LOG_DETAILS, message: err instanceof Error ? err.message : err.toString() });
            sendUnexpectedError(res, err);
        }

    });
};

export default addRoute;
