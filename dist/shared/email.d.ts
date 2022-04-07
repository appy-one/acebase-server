export interface AceBaseEmailRequest {
    /** email request type */
    type: string;
}
export interface AceBaseUserEmailRequest extends AceBaseEmailRequest {
    user: {
        uid: string;
        email: string;
        username?: string;
        displayName?: string;
        settings?: any;
    };
    ip: string;
    date: Date;
}
export interface AceBaseUserSignupEmailRequest extends AceBaseUserEmailRequest {
    type: 'user_signup';
    activationCode: string;
    emailVerified: boolean;
    provider: string;
}
export interface AceBaseUserSignInEmailRequest extends AceBaseUserEmailRequest {
    type: 'user_signin';
    activationCode: string;
    emailVerified: boolean;
    provider: string;
}
export interface AceBaseUserResetPasswordEmailRequest extends AceBaseUserEmailRequest {
    type: 'user_reset_password';
    resetCode: string;
}
export interface AceBaseUserResetPasswordSuccessEmailRequest extends AceBaseUserEmailRequest {
    type: 'user_reset_password_success';
}
