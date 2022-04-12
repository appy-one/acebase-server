export class ConnectedClient {
    /**
     *
     * @param socket Socket object used by the framework
     * @param id optional: use if the socket object does not have an `id` property.
     */
    constructor(socket, id) {
        this.socket = socket;
        // get id() { return this.socket.id; };
        this.connectedDate = new Date();
        /** Active event subscriptions for this client */
        this.subscriptions = {};
        /** Active realtime query subscriptions for this client */
        this.realtimeQueries = {};
        /** Currently running transactions */
        this.transactions = {};
        this.id = id ?? socket.id;
        if (!this.id) {
            throw new Error('Socket has no id');
        }
    }
}
//# sourceMappingURL=clients.js.map