import { IOAuth2Provider, IOAuth2ProviderSettings, IOAuth2AuthCodeParams, IOAuth2RefreshTokenParams } from "./oauth-provider";
/**
 * Details of your app to access the Facebook Graph API
 */
export interface IFacebookAuthSettings extends IOAuth2ProviderSettings {
    /** 'email' and additional scopes you want to access. See https://developers.facebook.com/docs/facebook-login/permissions/ */
    scopes?: string[];
}
interface IFacebookAuthToken {
    access_token: string;
    expires_in: number;
    expires: Date;
    refresh_token: string;
    scope: string;
    token_type: string;
}
export declare class FacebookAuthProvider implements IOAuth2Provider {
    private settings;
    constructor(settings: IFacebookAuthSettings);
    /**
     * Starts auth flow by getting the url the user should be redirected to
     * @param info.redirectUrl Url spotify will redirect to after authorizing, should be the url
     * @param info.state Optional state that will be passed to redirectUri by spotify
     */
    init(info: {
        redirect_url: string;
        state?: string;
    }): Promise<string>;
    getAccessToken(params: IOAuth2AuthCodeParams | IOAuth2RefreshTokenParams): Promise<IFacebookAuthToken>;
    getUserInfo(access_token: string): Promise<{
        id: string;
        name: string;
        display_name: string;
        picture: {
            width: number;
            height: number;
            url: string;
        }[];
        email: string;
        email_verified: boolean;
        other: {};
    }>;
}
export declare const AuthProvider: typeof FacebookAuthProvider;
export {};
