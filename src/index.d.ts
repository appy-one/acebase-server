import * as Express from 'express';
import { AceBase } from 'acebase';

declare namespace acebaseserver {
    class AceBaseServer {
        constructor(dbname: string, options?: AceBaseServerSettings)

        /**
         * Wait for the server to be ready to accept incoming connections
         * @param callback (optional) callback function that is called when ready. You can also use the returned promise
         * @returns returns a promise that resolves when ready
         */
        ready(callback?: () => void): Promise<void>

        get url(): string

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
        get db(): AceBase

        /**
         * @param {string} clientIp ip address of the user
         * @param {string} code verification code sent to the user's email address
         */
        verifyEmailAddress(clientIp: string, code: string): Promise<void>

        /**
         * @param {string} clientIp ip address of the user
         * @param {string} code reset code that was sent to the user's email address
         * @param {string} newPassword new password chosen by the user
         */
        resetPassword(clientIp: string, code: string, newPassword: string): Promise<void>
        
        /**
         * Configure an auth provider to allow users to sign in with Facebook, Google, etc
         * @param providerName name of the thrird party OAuth provider. Eg: "Facebook", "Google", "spotify" etc
         * @param settings API key & secret for the OAuth provider
         * @returns Returns the created auth provider instance, which can be used to call non-user specific methods the provider might support. (example: the Spotify auth provider supports getClientAuthToken, which allows API calls to be made to the core (non-user) spotify service)
         */
        configAuthProvider(providerName: string, settings: IOAuthProviderSettings): any

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
        extend(method:'get'|'put'|'post'|'delete', ext_path: string, handler: (req: Express.Request, res: Express.Response) => any): void

        /**
         * Shuts down the server. Stops listening for incoming connections, breaks current connections and closes the database.
         * Is automatically executed when a "SIGINT" process event is received.
         * 
         * Once the shutdown procedure is completed, it emits a "shutdown" event on the server instance, "acebase-server-shutdown" event on the `process`, and sends an 'acebase-server-shutdown' IPC message if Node.js clustering is used.
         * These events can be handled by cluster managing code to `kill` or `exit` the process safely.
         */
        shutdown(): Promise<void>

        /** Temporarily stops the server from handling incoming connections, but keeps existing connections open */
        pause(): Promise<void>
        /** Resumes handling incoming connections */
        resume(): Promise<void>
    }

    interface IOAuthProviderSettings {
        /** The Client/App ID generated for your app in the Provider's API developer environment */
        client_id: string
        /** The Client/App Secret generated for your app in the Provider's API developer environment */
        client_secret: string
        /** Default scopes requested include email and some profile details such as name & picture. You can define additional scopes you'd want to request here */
        scopes?: string[]
    }


    interface AceBaseServerSettings {
        /** Level of messages logged to console */
        logLevel?: 'verbose'|'log'|'warn'|'error'
        /** ip or hostname to start the server on */
        host?: string
        /** port number the server will be listening */
        port?: number
        /** target directory path to store/open the database. Default is '.' */
        path?: string
        /** Whether to use secure sockets layer (ssl) */
        https?: AceBaseServerHttpsSettings
        /** settings that define if and how authentication is used */
        authentication?: AceBaseServerAuthenticationSettings
        /** maximum size to allow for posted data, eg for updating nodes. Default is '10mb' */
        maxPayloadSize?: string
        /** Value to use for Access-Control-Allow-Origin CORS header. Default is '*' */
        allowOrigin?: string
        /** Email settings that enable AceBaseServer to send e-mails, eg for welcoming new users, to reset passwords, notify of new sign ins etc */
        email?: AceBaseServerEmailSettings
        /** Transaction logging settings. Warning: BETA stage, do NOT use in production yet */
        transactions?: AceBaseServerTransactionLogSettings
        /** IPC settings for pm2 or cloud-based clusters. BETA stage, see https://github.com/appy-one/acebase-ipc-server */
        ipc?: IPCClientSettings
        /** Allows overriding of default storage settings used by the database. ALPHA stage */
        storage?: any
    }

    interface AceBaseServerHttpsSettings {
        enabled?: boolean
        keyPath?: string
        certPath?: string
        pfxPath?: string
        passphrase?: string
    }

    interface AceBaseServerAuthenticationSettings {
        enabled?: boolean
        allowUserSignup?: boolean
        /** 'allow', 'deny' or 'auth' */
        defaultAccessRule?: string
        defaultAdminPassword?: string
        separateDb?: boolean
        /** @deprecated Misspelled, use separateDb instead */
        seperateDb?: boolean
    }

    interface AceBaseServerEmailSettings {
        /**
         * @param request Callback function to call when an e-mail needs to be sent
         */
        send?(request: AceBaseEmailRequest): Promise<boolean>
        /**
         * NOT IMPLEMENTED YET - Use send property for your own implementation
         */
        server?: AceBaseServerEmailServerSettings
    }

    interface AceBaseServerEmailServerSettings {
        host: string
        port: number
        username?: string
        password?: string
        secure?: boolean
    }

    interface AceBaseServerTransactionLogSettings {
        log?: boolean;
        maxAge?: number;
        noWait?: boolean;        
    }
    interface IPCClientSettings {
        /** IPC Server hostname. Default is "localhost" */
        host?: string
        /** IPC Server port */
        port: number
        /** IPC Server token needed to access the server. Only needed if the server does not use a token */
        token?: string
        /** Whether to use a secure connection to the IPC server, default is `false` */
        ssl?: boolean
        /** Role of the IPC Client. There can only be 1 `master`, all other need to be a `worker`. */
        role: 'master'|'worker'
    }
    interface AceBaseEmailRequest {
        readonly type: string
        readonly ip: string
        readonly date: Date
    }
    interface AceBaseUserEmailRequest extends AceBaseEmailRequest {
        readonly user: {
            readonly uid: string
            readonly email?: string
            readonly username?: string
            readonly displayName: string
            readonly settings: any
        }
    }
    interface AceBaseUserSignupEmailRequest extends AceBaseUserEmailRequest {
        readonly type: 'user_signup'
        readonly verifyCode: string
    }
    interface AceBaseUserPasswordResetEmailRequest extends AceBaseUserEmailRequest {
        readonly type: 'user_reset_password'
        readonly resetCode: string
    }

    // enum AccessDefault {
    //     DENY_ALL,
    //     ALLOW_ALL,
    //     ALLOW_AUTHENTICATED
    // }
}

export = acebaseserver