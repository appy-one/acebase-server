import type { Socket } from 'socket.io';
export type { Express, Request, Response } from 'express';
import * as express from 'express';
const createExpress = (express as any).default ?? express; // ESM and CJS compatible approach

export type HttpApp = express.Express;
export type HttpSocket = Socket;

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

    return app as HttpApp;
}