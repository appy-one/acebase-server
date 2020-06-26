declare namespace acebaseserver {
    class AceBaseServer {
        constructor(dbname: string, options?: AceBaseServerSettings)
        ready(callback: () => void): Promise<void>
        get url(): string

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
         * Configure an OAuth provider to allow users to sign in with Facebook, Google, etc
         * @param providerName name of the thrird party OAuth provider. Eg: "Facebook", "Google", "spotify" etc
         * @param settings API key & secret for the OAuth provider
         */
        configOAuthProvider(providerName: string, settings: OAuthProviderSettings)
    }

    interface OAuthProviderSettings {
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