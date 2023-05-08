import type { Socket } from 'socket.io';
export type { Express, Request, Response } from 'express';
import * as express from 'express';
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
export declare const createApp: (settings: {
    trustProxy: boolean;
    maxPayloadSize: string;
}) => express.Express;
/**
 * Creates an express router
 * @returns
 */
export declare const createRouter: () => express.Router;
//# sourceMappingURL=http.d.ts.map