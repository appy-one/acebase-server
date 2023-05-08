import type { Socket } from 'socket.io';
import { RouteInitEnvironment } from '../shared/env';
import { WebSocketManager } from './manager';
export type SocketType = Socket;
export declare class SocketIOManager extends WebSocketManager<Socket> {
    constructor();
    disconnect(socket: Socket): void;
    send(socket: Socket, event: string, message?: any): void;
}
export declare const createServer: (env: RouteInitEnvironment) => SocketIOManager;
//# sourceMappingURL=socket.io.d.ts.map