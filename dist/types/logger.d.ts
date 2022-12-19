import { DataReference } from 'acebase-core';
export declare class DatabaseLog {
    private logRef;
    constructor(logRef: DataReference);
    /**
     * Logs an action initiated by a client/user with a positive or negative outcome. Used by `success` and `failure`
     * @param action action identifier
     * @param success whether the action was successful
     * @param details any additional details to be logged
     */
    event(action: string, details: any): Promise<void>;
    /**
     * Logs a system warning
     * @param action action identifier
     * @param code warning code
     * @param details any additional details to be logged
     */
    warning(action: string, code: string, details: any): Promise<void>;
    /**
     * Logs a system or client/user error
     * @param action action identifier
     * @param code error code
     * @param details any additional details to be logged
     */
    error(action: string, code: string, details: any, unexpectedError?: any): Promise<void>;
    /**
     * Query the logs
     * @returns
     */
    query(): import("acebase-core").DataReferenceQuery;
    /**
     * Reference to the logs database collection
     */
    get ref(): DataReference;
}
//# sourceMappingURL=logger.d.ts.map