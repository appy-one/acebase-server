import type { Socket } from 'socket.io';
export type { Express, Request, Response } from 'express';
import * as express from 'express';
const createExpress = (express as any).default ?? express; // ESM and CJS compatible approach

export type HttpApp = express.Express;
export type HttpRouter = express.Router;
export type HttpSocket = Socket;
export type HttpRequest = express.Request;
export type HttpResponse = express.Response;

/**
 * Creates an app that handles http requests, adds json body parsing.
 * @param settings
 * @returns
 */
export const createApp = (settings: { trustProxy: boolean; maxPayloadSize: string }) => {
    const app = createExpress();

    // When behind a trusted proxy server, req.ip and req.hostname will be set the right way
    app.set('trust proxy', settings.trustProxy);

    // Parse json request bodies
    app.use(express.json({ limit: settings.maxPayloadSize })); // , extended: true ?

    // Handle body parsing errors ourselves, preventing Express' default error handler from
    // sending detailed error info (including stack trace) to the client
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (typeof err?.type !== 'string' || typeof err?.status !== 'number') {
            // Not a body-parser error
            return next(err);
        }
        const code = err.type === 'entity.parse.failed' ? 'invalid_json'
            : err.type === 'entity.too.large' ? 'payload_too_large'
                : 'invalid_body';
        const message = err.type === 'entity.parse.failed' ? 'Request body is not valid JSON'
            : err.type === 'entity.too.large' ? 'Request body is too large'
                : 'Request body could not be read';
        res.status(err.status >= 400 && err.status < 500 ? err.status : 400)
            .contentType('application/json')
            .send({ code, message });
    });

    return app as HttpApp;
};

/**
 * Creates an express router
 * @returns
 */
export const createRouter = () => {
    return createExpress.Router() as HttpRouter;
};
