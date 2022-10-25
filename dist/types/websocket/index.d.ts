import { RouteInitEnvironment } from "../shared/env";
export declare class SocketRequestError extends Error {
    code: string;
    constructor(code: string, message: string);
}
export declare const addWebsocketServer: (env: RouteInitEnvironment) => import("./socket.io").SocketIOManager;
//# sourceMappingURL=index.d.ts.map