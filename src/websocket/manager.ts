import { SimpleEventEmitter } from "acebase-core";

export type WebSocketEventData<SocketType, DataType = undefined> = {
    socket: SocketType;
    socket_id: string;
    data?: DataType;
}
export type WebSocketEventCallback<SocketType, DataType = any> = (event: WebSocketEventData<SocketType, DataType>) => void;

export abstract class WebSocketManager<SocketType> extends SimpleEventEmitter {
    constructor(public readonly framework: string) {
        super();
    }
    abstract disconnect(socket: SocketType): any;
    abstract send(socket: SocketType, event: string, message: any): any;

    on(event: 'connect', callback: WebSocketEventCallback<SocketType>): void;
    on(event: 'disconnect', callback: WebSocketEventCallback<SocketType>): void;
    /** @deprecated deprecated since client v0.9.4 */
    on(event: 'signin', callback: WebSocketEventCallback<SocketType, { accessToken: string }>): void;
    /** @deprecated deprecated since client v0.9.4 */
    on(event: 'signout', callback: WebSocketEventCallback<SocketType>): void;
    on(event: 'oauth2-signin', callback: WebSocketEventCallback<SocketType, { server: { protocol: 'http'|'https', host: string, port: number }; provider: string; options: any }>): void;
    on(event: 'subscribe', callback: WebSocketEventCallback<SocketType, { req_id: string; path: string; event: string }>): void;
    on(event: 'unsubscribe', callback: WebSocketEventCallback<SocketType, { req_id: string; path: string; event?: string }>): void;
    on(event: 'query-unsubscribe', callback: WebSocketEventCallback<SocketType, { req_id: string; query_id: string }>): void;
    on(event: 'transaction-start', callback: WebSocketEventCallback<SocketType, { action: 'start', id: string; path: string; context: any }>): void;
    on(event: 'transaction-finish', callback: WebSocketEventCallback<SocketType, { action: 'finish', id: string; path: string; value: any }>): void;
    on(event: string, callback: (data: any) => void) {
        super.on(event, callback);
    }

    emit(event: 'connect', data: WebSocketEventData<SocketType>): this;
    emit(event: 'disconnect', data: WebSocketEventData<SocketType, string>): this;
    /** @deprecated deprecated since client v0.9.4 */
    emit(event: 'signin', data: WebSocketEventData<SocketType, { accessToken: string }>): this;
    /** @deprecated deprecated since client v0.9.4 */
    emit(event: 'signout', data: WebSocketEventData<SocketType>): this;
    emit(event: 'oauth2-signin', data: WebSocketEventData<SocketType, { server: { protocol: 'http'|'https', host: string, port: number }; provider: string; options: any }>): this;
    emit(event: 'subscribe', data: WebSocketEventData<SocketType, { req_id: string; path: string; event: string }>): this;
    emit(event: 'unsubscribe', data: WebSocketEventData<SocketType, { req_id: string; path: string; event?: string }>): this;
    emit(event: 'query-unsubscribe', data: WebSocketEventData<SocketType, { req_id: string; query_id: string }>): this;
    emit(event: 'transaction-start', data: WebSocketEventData<SocketType, { action: 'start', id: string; path: string; context: any }>): this;
    emit(event: 'transaction-finish', data: WebSocketEventData<SocketType, { action: 'finish', id: string; path: string; value: any }>): this;
    emit(event: string, data: any) { super.emit(event, data); return this; }
}