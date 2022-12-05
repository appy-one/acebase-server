import type { Socket } from 'socket.io';
export type { Express, Request, Response } from 'express';
import * as express from 'express';
export declare type HttpApp = express.Express;
export declare type HttpSocket = Socket;
export declare type HttpRequest = express.Request;
export declare type HttpResponse = express.Response;
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
export declare const createRouter: () => any;
//# sourceMappingURL=http.d.ts.map