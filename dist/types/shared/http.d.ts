import type { Socket } from 'socket.io';
export type { Express, Request, Response } from 'express';
import * as express from 'express';
export declare type HttpApp = express.Express;
export declare type HttpSocket = Socket;
/**
 * Creates an app that handles http requests, adds json body parsing.
 * @param settings
 * @returns
 */
export declare const createApp: (settings: {
    trustProxy: boolean;
    maxPayloadSize: string;
}) => any;
