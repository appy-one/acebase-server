export { Request, Response } from 'express';
import * as express from 'express';
import { Socket} from 'socket.io';

export type HttpApp = express.Express;
export type HttpSocket = Socket;

/**
 * Creates an app that handles http requests, adds json body parsing.
 * @param settings 
 * @returns 
 */
export const createApp = (settings: { trustProxy: boolean; maxPayloadSize: string }) => {
    const app = express();

    // When behind a trusted proxy server, req.ip and req.hostname will be set the right way
    app.set('trust proxy', settings.trustProxy);

    // Parse json request bodies
    app.use(express.json({ limit: settings.maxPayloadSize })); // , extended: true ?

    return app;
}