import { RouteInitEnvironment, RouteRequest } from "../shared/env";

export const addMiddleware = (env: RouteInitEnvironment) => {

    env.app.use((req: RouteRequest, res, next) => {
        // Setup AceBase context, to allow clients to pass contextual info with data updates,
        // that will be sent along to data event subscribers on affected data.
        const context = req.get('AceBase-Context');
        try {
            req.context = context && JSON.parse(context);
        }
        catch(err) {
            env.debug.error(`Failed to parse AceBase-Context header: "${context}" in request at ${req.url} from client ${req.ip}`);
        }
        // console.log(`Received request on path ` + req.path);
        next();
    });

};

export default addMiddleware;