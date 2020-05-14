declare namespace acebaseserver {
    class AceBaseServer {
        constructor(dbname: string, options?: AceBaseServerSettings)
        ready(callback: () => void): Promise<void>
        get url(): string
    }

    interface AceBaseServerSettings {
        logLevel?: 'verbose'|'log'|'warn'|'error'
        host?: string
        port?: number
        path?: string
        https?: AceBaseServerHttpsSettings
        authentication?: AceBaseServerAuthenticationSettings
        maxPayloadSize?: string
        allowOrigin?: string
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