declare namespace acebaseserver {
    class AceBaseServer {
        constructor(dbname: string, options?: AceBaseServerSettings)
        ready(callback: () => void): Promise<void>
        get url(): string
    }

    interface AceBaseServerSettings {
        logLevel?: string
        host?: string
        port?: number
        path?: string
        https?: AceBaseServerHttpsSettings
        authentication?: AceBaseServerAuthenticationSettings
        maxPayloadSize?: string
        allowOrigin?: string
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
    }

    // enum AccessDefault {
    //     DENY_ALL,
    //     ALLOW_ALL,
    //     ALLOW_AUTHENTICATED
    // }
}

export = acebaseserver