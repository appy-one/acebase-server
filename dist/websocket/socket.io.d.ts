import * as socketIO from 'socket.io';
import { RouteInitEnvironment } from '../shared/env';
import { WebSocketManager } from './manager';
export declare type SocketType = socketIO.Socket;
export declare class SocketIOManager extends WebSocketManager<socketIO.Socket> {
    constructor();
    disconnect(socket: socketIO.Socket): void;
    send(socket: socketIO.Socket, event: string, message?: any): void;
}
export declare const createServer: (env: RouteInitEnvironment) => SocketIOManager;
