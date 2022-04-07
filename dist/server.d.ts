/// <reference types="express-serve-static-core" />
import { DebugLogger, SimpleEventEmitter } from 'acebase-core';
import { AceBaseServerSettings, AceBaseServerConfig } from './settings';
import { AceBase } from 'acebase';
import { DbUserAccountDetails } from './schema/user';
export declare class AceBaseServerNotReadyError extends Error {
    constructor();
}
export declare class AceBaseServer extends SimpleEventEmitter {
    private _ready;
    get isReady(): boolean;
    /**
     * Wait for the server to be ready to accept incoming connections
     * @param callback (optional) callback function that is called when ready. You can also use the returned promise
     * @returns returns a promise that resolves when ready
     */
    ready(callback?: () => any): Promise<void>;
    /**
     * Gets the active server configuration
     */
    readonly config: AceBaseServerConfig;
    /**
     * Gets the url the server is running at
     */
    get url(): string;
    readonly debug: DebugLogger;
    /**
     * Gets direct access to the database, this bypasses any security rules and schema validators.
     * You can use this to add custom event handlers ("cloud functions") to your database directly.
     * NOTE: your code will run in the same thread as the server, make sure you are not performing
     * CPU heavy tasks here. If you have to do heavy weightlifting, create a seperate app that connects
     * to your server with an AceBaseClient, or execute in a worker thread.
     * @example
     * server.db.ref('uploads/images').on('child_added', async snap => {
     *    const image = snap.val();
     *    const resizedImages = await createImageSizes(image); // Some function that creates multiple image sizes in worker thread
     *    const targetRef = await server.db.ref('images').push(resizedImages); // Store them somewhere else
     *    await snap.ref.remove(); // Remove original upload
     * });
     */
    readonly db: AceBase;
    private readonly authProviders;
    constructor(dbname: string, options?: AceBaseServerSettings);
    private init;
    /**
     * Reset a user's password. This can also be done using the auth/reset_password API endpoint
     * @param clientIp ip address of the user
     * @param code reset code that was sent to the user's email address
     * @param newPassword new password chosen by the user
     */
    resetPassword(clientIp: string, code: string, newPassword: string): Promise<DbUserAccountDetails>;
    /**
     * Marks a user account's email address as validated. This can also be done using the auth/verify_email API endpoint
     * @param clientIp ip address of the user
     * @param code verification code sent to the user's email address
     */
    verifyEmailAddress(clientIp: string, code: string): Promise<void>;
    /**
     * Shuts down the server. Stops listening for incoming connections, breaks current connections and closes the database.
     * Is automatically executed when a "SIGINT" process event is received.
     *
     * Once the shutdown procedure is completed, it emits a "shutdown" event on the server instance, "acebase-server-shutdown" event on the `process`, and sends an 'acebase-server-shutdown' IPC message if Node.js clustering is used.
     * These events can be handled by cluster managing code to `kill` or `exit` the process safely.
     */
    shutdown(): void;
    /**
     * Temporarily stops the server from handling incoming connections, but keeps existing connections open
     */
    pause(): Promise<void>;
    /**
     * Resumes handling incoming connections
     */
    resume(): Promise<void>;
    /**
     * Extend the server API with your own custom functions. Your handler will be listening
     * on path /ext/[db name]/[ext_path].
     * @example
     * // Server side:
     * const _quotes = [...];
     * server.extend('get', 'quotes/random', (req, res) => {
     *      let index = Math.round(Math.random() * _quotes.length);
     *      res.send(quotes[index]);
     * })
     * // Client side:
     * client.callExtension('get', 'quotes/random')
     * .then(quote => {
     *      console.log(`Got random quote: ${quote}`);
     * })
     * @param {'get'|'put'|'post'|'delete'} method
     * @param {string} ext_path
     * @param {(req: Express.Request, res: Express.Response)} handler
     */
    extend(method: 'get' | 'put' | 'post' | 'delete', ext_path: string, handler: (req: Express.Request, res: Express.Response) => void): void;
    /**
     * Configure an auth provider to allow users to sign in with Facebook, Google, etc
     * @param providerName name of the third party OAuth provider. Eg: "Facebook", "Google", "spotify" etc
     * @param settings API key & secret for the OAuth provider
     * @returns Returns the created auth provider instance, which can be used to call non-user specific methods the provider might support. (example: the Spotify auth provider supports getClientAuthToken, which allows API calls to be made to the core (non-user) spotify service)
     */
    configAuthProvider(providerName: string, settings: any): any;
}
