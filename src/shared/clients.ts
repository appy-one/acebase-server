import { EventSubscriptionCallback, IApiQuery, IApiQueryOptions } from "acebase-core/src/api";
import { DbUserAccountDetails } from "../schema/user";
import { HttpSocket } from "./http";

export class ConnectedClient {
    readonly id: string;

    /**
     * 
     * @param socket Socket object used by the framework
     * @param id optional: use if the socket object does not have an `id` property.
     */
    constructor (public socket: HttpSocket, id?: string) { 
        this.id = id ?? socket.id;
        if (!this.id) { throw new Error('Socket has no id'); }
    }
    // get id() { return this.socket.id; };
    readonly connectedDate: Date = new Date();
    
    /** user details if this socket client is signed in */
    user?: DbUserAccountDetails;
    
    /** Active event subscriptions for this client */
    subscriptions: { [path: string]: Array<{ path: string, event: string, callback: EventSubscriptionCallback }> } = {};
    
    /** Active realtime query subscriptions for this client */
    realtimeQueries: { [id: string]: { path: string; query: IApiQuery, options: IApiQueryOptions }} = {};
    
    /** Currently running transactions */
    transactions: { [id: string]: { id: string; started: number; path: string; context: any; finish?: (val?: any) => Promise<any> } } = {};
}