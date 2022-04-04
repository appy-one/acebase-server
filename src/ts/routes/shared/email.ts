interface AceBaseEmailRequest {
    /** email request type */
    type: string;
};

interface AceBaseUserEmailRequest extends AceBaseEmailRequest {
    user: { uid: string; email: string; username?: string; displayName?: string; settings?: any };
    ip: string;
    date: Date
};

export interface AceBaseUserSignupEmailRequest extends AceBaseUserEmailRequest {
    type: 'user_signup';
    activationCode: string;
    emailVerified: boolean;
    provider: string;
};

export interface AceBaseUserSignInEmailRequest extends AceBaseUserEmailRequest {
    type: 'user_signin';
    activationCode: string;
    emailVerified: boolean;
    provider: string;
};

export interface AceBaseUserResetPasswordEmailRequest extends AceBaseUserEmailRequest {
    type: 'user_reset_password';
    resetCode: string;
}

export interface AceBaseUserResetPasswordSuccessEmailRequest extends AceBaseUserEmailRequest {
    type: 'user_reset_password_success';
}


export interface AceBaseServerEmailServerSettings {
    host: string;
    port: number;
    username?: string;
    password?: string;
    secure: boolean;
};

export interface AceBaseServerEmailSettings {
    /** NOT IMPLEMENTED YET - Use send property for your own implementation */
    server?: AceBaseServerEmailServerSettings;
    /** function to call when an e-mail needs to be sent */
    send: (request: AceBaseEmailRequest) => Promise<any>|void;
};