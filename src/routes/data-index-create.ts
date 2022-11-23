import adminOnly from '../middleware/admin-only';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
import { sendError } from '../shared/error';
import { Response } from '../shared/http';

export type FullTextIndexOptions = {
    type: 'fulltext';
    config?: {
        /** Callback function that transforms (and/or filters) words being indexed _and_ queried */
        transform?: (locale: string, word: string) => string;
        /** Also known as a stoplist. Array of words to automatically be ignored for indexing and querying. */
        blacklist?: string[];
        /** Words to be included if they did not match minLength and/or blacklist criteria */
        whitelist?: string[];
        /** Only use words with a minimum length */
        minLength?: number;
        /** Only use words with a maximum length */
        maxLength?: number;
        /** Specify a key in the data that contains the locale of the indexed texts. This allows multiple languages to be indexed using their own rules. */
        localeKey?: string;
        /** Boolean value that specifies whether a default stoplist for the used locale should be used to automatically blacklist words. Currently only available for locale "en", which contains very frequently used words like "a", "i", "me", "it", "the", "they", "them" etc. */
        useStoplist?: boolean;
    }
};
export type GeoIndexOptions = {
    type: 'geo';
};
export type ArrayIndexOptions = {
    type: 'array';
};

export type CreateIndexRequest = {
    path: string;
    key: string;
    options?: {
        type?: 'normal'|'array'|'fulltext'|'geo';
        rebuild?: boolean;
        textLocale?: string;
        include?: string[];
        config?: {}
    } & ({} | FullTextIndexOptions | GeoIndexOptions | ArrayIndexOptions);
};

export type RequestQuery = null;
export type RequestBody = CreateIndexRequest;
export type ResponseBody = { success: true }    // 200
    | { code: 'admin_only'; message: string }   // 403
    | { code: 'unexpected'; message: string };  // 500 (TODO check if 400 is also possible)

export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {

    const handleRequest = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            await env.db.indexes.create(data.path, data.key, data.options);
            res.contentType('application/json').send({ success: true });
        }
        catch(err) {
            env.debug.error(`failed to perform index action`, err);
            sendError(res, err);
        }
    };

    env.app.post(`/index/${env.db.name}`, adminOnly(env), async (req: RouteRequest<any, RequestBody & { action: 'create'}, ResponseBody>, res) => {
        // Legacy endpoint that was designed to handle multiple actions
        // The only action ever implemented was 'create', so we'll handle that here
        if (req.body?.action !== 'create') {
            return sendError(res, { code: 'invalid_action', message: 'Invalid action' });
        }
        handleRequest(req, res);
    });

    env.app.post(`/index/${env.db.name}/create`, adminOnly(env), async (req: Request, res) => {
        // New dedicated create endpoint
        handleRequest(req, res);
    });

};

export default addRoute;