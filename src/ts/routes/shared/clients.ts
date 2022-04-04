import { DbUserAccountDetails } from "../schema/user";

export class Client {
    connected: Date;
    socket: any;
    /** user details if this socket client is signed in */
    user?: DbUserAccountDetails;
    get id() { return this.socket.id; };
}

// export const clients = new Map<string, Client>();